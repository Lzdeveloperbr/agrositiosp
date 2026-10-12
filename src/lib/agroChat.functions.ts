import { createServerFn } from "@tanstack/react-start";

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type ChatInput = {
  messages: ChatMsg[];
  codigo: string;
  numeroLote?: string;
};

const SYSTEM = `Você é o **Agro IA**, assistente especialista em agropecuária brasileira (granja de frango de corte Cobb/Ross, gado de corte/leite, plantio de milho/soja/café/cana), trabalhando para um produtor do Sítio Santo Antônio em Meridiano-SP.

Você recebe junto da conversa um JSON com o **CONTEXTO atual da fazenda** (lote ativo, mortalidade, peso, gado, estoque, finanças, etc). Use esses números reais — NUNCA invente dados.

Estilo de resposta:
- Português brasileiro, direto, técnico mas claro.
- Use **negrito**, listas e tabelas Markdown quando ajudar.
- Se a pergunta exige cálculo (CA, GPD, IEP, dose de adubo, lotação animal/ha, kg de ração restante, dias até abate, etc), MOSTRE a fórmula e o resultado.
- Para dúvidas de manejo/sanidade/nutrição, dê resposta prática e cite valores de referência (Ross AP 95, Cobb 500, etc) quando relevante.
- Se faltar dado no contexto para responder com precisão, peça exatamente o que falta em 1 linha.
- Nunca recomende medicamento sem orientar consulta a veterinário responsável técnico.

Você pode responder também sobre: cotações de boi/milho/soja, clima, IATF, calagem, brucelose, vacinas obrigatórias, GTA, escrituração financeira rural e tudo de agro.`;

export const chatAgroIA = createServerFn({ method: "POST" })
  .inputValidator((d: ChatInput) => {
    if (!d || !Array.isArray(d.messages) || d.messages.length === 0) throw new Error("messages obrigatório");
    if (d.messages.length > 200 || JSON.stringify(d.messages).length > 120000) throw new Error("Conversa muito longa. Inicie uma nova conversa.");
    for (const m of d.messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) throw new Error("role inválido");
      if (typeof m.content !== "string" || m.content.length === 0) throw new Error("conteúdo vazio");
      if (m.content.length > 6000) throw new Error("mensagem muito longa");
    }
    if (typeof d.codigo !== "string" || !d.codigo.trim() || d.codigo.length > 80) throw new Error("Entre na granja antes de consultar a IA.");
    if (d.numeroLote !== undefined && (typeof d.numeroLote !== "string" || d.numeroLote.length > 80)) throw new Error("Lote inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { answerPoultry } = await import("./poultry-assistant.server");
    return answerPoultry(data);
  });
