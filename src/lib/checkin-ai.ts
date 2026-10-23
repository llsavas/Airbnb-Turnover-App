import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";

// Any language model listed by AI Gateway (https://ai-gateway.vercel.sh/v1/models).
// Authenticated with Vercel OIDC on deployments, so no API key is needed.
const MODEL = process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-haiku-5.5";
// Long conversations are cut to their most recent part.
const MAX_CHARS = 12_000;

const detailsSchema = z.object({
  guests: z
    .array(
      z.object({
        name: z.string().describe("Nome completo como o hóspede escreveu"),
        cpf: z
          .string()
          .nullable()
          .describe("CPF no formato 000.000.000-00, ou null se não foi informado"),
      }),
    )
    .describe("Todas as pessoas que vão se hospedar (até 4), na ordem em que aparecem, cada uma com seu CPF"),
  arrival_time: z
    .string()
    .nullable()
    .describe('Horário de chegada informado pelo hóspede, no formato "15h" ou "15h30", ou null'),
  vehicle_plate: z.string().nullable().describe("Placa do carro, em maiúsculas, ou null"),
  notes: z
    .string()
    .nullable()
    .describe("Outra informação útil para a portaria ou a limpeza, em uma frase curta, ou null"),
});

export type GuestDetails = {
  guests: { name: string; cpf: string | null }[];
  arrival_time: string | null;
  vehicle_plate: string | null;
  ai_notes: string | null;
};

const CPF = /\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g;
const HAS_CPF = new RegExp(CPF.source);
// Brazilian plates, old (ABC-1234) and Mercosul (ABC1D23).
const PLATE = /\b([A-Z]{3})-?(\d[A-Z0-9]\d{2})\b/;

// "chegamos às 15h", "chegada por volta das 22:30"
const ARRIVAL = /cheg\w*[^\n\d]{0,30}?\b([01]?\d|2[0-3])(?:\s*[:h]\s*([0-5]\d))?\s*(h|hs|horas)?\b/i;
// Words that show a line is a sentence, not someone's name.
const NOT_A_NAME =
  /\b(segue|seguem|dados|cpf|rg|nome|olá|ola|oi|bom|boa|abaixo|obrigad\w*|hóspede\w*|hospede\w*|reserva|check|placa|carro)\b/i;

// The guest's name usually sits right before the CPF ("Ana Souza 123.456.789-00",
// "Ana Souza - CPF: …") or on the line above it.
function nameNear(lines: string[], lineIndex: number, before: string): string {
  const clean = (s: string) =>
    s
      .replace(/\d/g, " ")
      .replace(/\b(cpf|nome|rg)\b/gi, " ")
      .replace(/[:;|,\-–—•*()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const isName = (s: string) =>
    /^[\p{L}' ]+$/u.test(s) && s.split(" ").length >= 2 && s.split(" ").length <= 7 && !NOT_A_NAME.test(s);

  const sameLine = clean(before);
  if (isName(sameLine)) return sameLine;
  for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 2); i--) {
    if (HAS_CPF.test(lines[i])) break; // that line belongs to the previous guest
    const candidate = clean(lines[i]);
    if (isName(candidate)) return candidate;
  }
  return "";
}

// Fallback when the AI can't be reached: guests (name + CPF), arrival time and
// plate by pattern.
export function readGuestDetailsByPattern(
  messages: { body: string | null; sender_type: string }[],
): GuestDetails {
  const bodies = messages.filter((m) => m.sender_type === "guest" && m.body).map((m) => m.body!);
  const guests = new Map<string, string>();
  for (const body of bodies) {
    const lines = body.split(/\r?\n/);
    lines.forEach((line, i) => {
      let previousEnd = 0;
      for (const m of line.matchAll(CPF)) {
        const cpf = `${m[1]}.${m[2]}.${m[3]}-${m[4]}`;
        const name = nameNear(lines, i, line.slice(previousEnd, m.index));
        if (!guests.has(cpf) || (name && !guests.get(cpf))) guests.set(cpf, name);
        previousEnd = m.index + m[0].length;
      }
    });
  }
  const text = bodies.join("\n");
  const plate = text.toUpperCase().match(PLATE);
  const arrival = text.match(ARRIVAL);
  return {
    guests: [...guests].map(([cpf, name]) => ({ name, cpf })),
    arrival_time: arrival ? `${Number(arrival[1])}h${arrival[2] ?? ""}` : null,
    vehicle_plate: plate ? `${plate[1]}${plate[2]}` : null,
    ai_notes: null,
  };
}

export async function readGuestDetails(
  reservationName: string | null,
  messages: { body: string | null; sender_type: string; created_at: string }[],
): Promise<GuestDetails> {
  const transcript = messages
    .filter((m) => m.body?.trim())
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => `[${m.sender_type === "guest" ? "Hóspede" : "Anfitrião"}] ${m.body!.trim()}`)
    .join("\n")
    .slice(-MAX_CHARS);

  if (!transcript) {
    return { guests: [], arrival_time: null, vehicle_plate: null, ai_notes: null };
  }

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: detailsSchema }),
    system:
      "Você extrai dados de check-in de conversas entre anfitrião e hóspede de um aluguel por temporada. " +
      "Use apenas o que o HÓSPEDE informou; nunca invente nem complete dados. " +
      "Uma reserva pode ter até 4 hóspedes: liste TODOS que tiverem nome ou CPF, inclusive o titular, " +
      "ligando cada CPF ao nome escrito junto dele. " +
      "Se uma informação não aparece, use null (ou lista vazia para hóspedes).",
    prompt: `Reserva em nome de: ${reservationName ?? "desconhecido"}\n\nConversa:\n${transcript}`,
  });

  return {
    guests: output.guests.map((g) => ({ name: g.name.trim(), cpf: g.cpf?.trim() || null })),
    arrival_time: output.arrival_time,
    vehicle_plate: output.vehicle_plate?.toUpperCase() ?? null,
    ai_notes: output.notes,
  };
}
