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

// ===== Relatório diário com imagens (multimodal) =====
export type RelatorioDiarioInput = {
  context: string;          // JSON string com respostas, clima, energia, etc
  fotos: string[];          // dataUrls (jpeg/png base64) — máx 6
  instrucoes?: string;      // override do prompt do usuário
};

export const gerarRelatorioDiarioIA = createServerFn({ method: "POST" })
  .inputValidator((d: RelatorioDiarioInput) => {
    if (!d || typeof d.context !== "string") throw new Error("context obrigatório");
    if (d.context.length > 20000) throw new Error("contexto grande demais");
    if (!Array.isArray(d.fotos)) throw new Error("fotos deve ser array");
    if (d.fotos.length > 6) throw new Error("máximo 6 fotos por relatório");
    for (const f of d.fotos) {
      if (typeof f !== "string" || !f.startsWith("data:image/")) throw new Error("foto inválida");
      if (f.length > 2_500_000) throw new Error("foto grande demais (>2MB) — comprima antes de enviar");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const system = `Você é um consultor agropecuário sênior (granja de frango, gado de corte e plantio) escrevendo o RELATÓRIO DIÁRIO PROFISSIONAL do Sítio Santo Antônio (Meridiano-SP).

Você recebe:
- JSON com as respostas do operador no quiz do dia, clima atual e consumo de energia.
- Fotos do dia (galpão, animais, pasto, plantio, equipamentos).

Analise as fotos com cuidado: estado da cama do aviário, comportamento e distribuição das aves, bebedouros/comedouros, condição corporal do gado, uniformidade do pasto, sinais de pragas/doenças, vazamentos, sujeira, riscos visíveis.

Escreva um RELATÓRIO em PORTUGUÊS, em Markdown limpo (use **negrito** e listas, sem títulos H1), com EXATAMENTE estas seções nesta ordem:

**1. Resumo Executivo do Dia** (3-4 linhas)
**2. Análise das Fotos** (1 bullet por foto — descreva o que vê e o que isso indica)
**3. Diagnóstico Operacional** (granja, gado, plantio — só o que tem dado)
**4. Análise Climática & Energia** (consumo do dia × clima, riscos próximos)
**5. Pontos de Atenção** (alertas concretos com base nas respostas + fotos)
**6. Plano para Amanhã** (3-6 ações práticas, priorizadas)
**7. Indicadores a Acompanhar**

Seja técnico, direto, sem encheção. Não invente dados que não estão no contexto ou nas fotos. Cite números reais quando houver.`;

    const userParts: any[] = [
      { type: "text", text: `Contexto do dia (JSON):\n${data.context}\n\n${data.instrucoes ?? "Gere o relatório completo conforme as instruções."}` },
      ...data.fotos.map((url, i) => ({ type: "image_url", image_url: { url }, _label: `Foto ${i + 1}` })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userParts },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Limite de IA atingido — tente novamente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos nas configurações.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Falha IA (${res.status}) ${t.slice(0, 120)}`);
    }
    const j: any = await res.json();
    const texto = j?.choices?.[0]?.message?.content ?? "";
    return { texto };
  });

