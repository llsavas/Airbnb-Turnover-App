import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Dicas para nota 5" };

const SECTIONS: { title: string; tips: string[] }[] = [
  {
    title: "O que mais derruba a nota",
    tips: [
      "Cabelo: no ralo, na pia, no box, no chão do banheiro e nos lençóis. Confira com a lanterna do celular.",
      "Banheiro: vaso com manchas, box com marcas de sabão e espelho respingado.",
      "Cozinha: gordura no fogão, micro-ondas sujo por dentro e louça mal lavada.",
      "Cheiro: lixo esquecido, ralo com mau cheiro ou apartamento abafado.",
      "Pó em lugares que o hóspede toca: cabeceira, mesa de cabeceira, controle remoto e interruptores.",
    ],
  },
  {
    title: "Pense como o hóspede",
    tips: [
      "Ao terminar, saia e entre de novo: o que você vê nos primeiros 10 segundos é o que ele vai ver.",
      "Sente na cama e no sofá e olhe em volta: é a altura dos olhos do hóspede.",
      "Abra a geladeira, o micro-ondas, as gavetas e o armário. O hóspede vai abrir.",
      "Olhe embaixo da cama e do sofá. Um objeto esquecido vira foto na avaliação.",
    ],
  },
  {
    title: "Apresentação",
    tips: [
      "Cama esticada, sem rugas, travesseiros alinhados: compare com a foto do anúncio.",
      "Toalhas dobradas sempre do mesmo jeito em todos os apartamentos.",
      "Papel higiênico com a ponta dobrada e rolo extra à vista.",
      "Cortinas abertas, luz natural e um aroma suave na entrada.",
    ],
  },
  {
    title: "Comunicação",
    tips: [
      "Algo quebrado, faltando ou sem funcionar? Reporte com foto na hora, antes do próximo hóspede chegar.",
      "Encontrou objeto esquecido? Reporte como \"Objeto esquecido\" com foto.",
      "Estoque baixo? Anote a contagem no app: a reposição é programada a partir dela.",
      "As fotos do checklist protegem você: mostram como o apartamento ficou.",
    ],
  },
];

export default function TipsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Dicas para nota 5 ★</h1>
        <p className="text-sm text-slate-500">
          A nota de limpeza é uma das que mais pesam na avaliação do Airbnb. Pequenos detalhes fazem
          a diferença.
        </p>
      </div>
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <h2 className="mb-2 font-semibold">{section.title}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-slate-800">
            {section.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
