import { createServerFn } from "@tanstack/react-start";

export type AIInsightInput = {
  context: string;
  question?: string;
};

export const gerarInsightAgro = createServerFn({ method: "POST" })
  .inputValidator((d: AIInsightInput) => {
    if (!d || typeof d.context !== "string") throw new Error("context obrigatório");
    if (d.context.length > 8000) throw new Error("contexto grande demais");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const prompt = `Você é um consultor agropecuário brasileiro experiente (granja de frango de corte, gado de corte e plantio).
Receberá um RESUMO da fazenda em JSON. Faça uma análise objetiva, em PORTUGUÊS, com:
1) "Diagnóstico" (3-5 bullets) — pontos fortes e alertas concretos baseados nos números.
2) "Próximos 7 dias" (3-5 ações práticas) — manejo, sanidade, financeiro, plantio.
3) "Oportunidades de economia/lucro" (2-3 bullets).
Seja direto, sem rodeios, use números reais do contexto. Responda em Markdown limpo (sem títulos H1, use **negrito** e listas).`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `Resumo da fazenda:\n${data.context}\n\n${data.question ?? ""}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Limite de IA atingido — tente novamente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos nas configurações.");
    if (!res.ok) throw new Error(`Falha IA (${res.status})`);

    const j: any = await res.json();
    const texto = j?.choices?.[0]?.message?.content ?? "";
    return { texto };
  });
