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
    .describe("Todas as pessoas que vão se hospedar e que foram citadas com nome"),
  arrival_time: z
    .string()
    .nullable()
    .describe('Horário de chegada informado pelo hóspede, ex.: "15h", "por volta das 22h"'),
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
// Brazilian plates, old (ABC-1234) and Mercosul (ABC1D23).
const PLATE = /\b([A-Z]{3})-?(\d[A-Z0-9]\d{2})\b/;

// Fallback when the AI can't be reached: CPFs and plate by pattern only.
export function readGuestDetailsByPattern(
  messages: { body: string | null; sender_type: string }[],
): GuestDetails {
  const text = messages
    .filter((m) => m.sender_type === "guest" && m.body)
    .map((m) => m.body!)
    .join("\n");
  const cpfs = [...new Set([...text.matchAll(CPF)].map((m) => `${m[1]}.${m[2]}.${m[3]}-${m[4]}`))];
  const plate = text.toUpperCase().match(PLATE);
  return {
    guests: cpfs.map((cpf) => ({ name: "", cpf })),
    arrival_time: null,
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
