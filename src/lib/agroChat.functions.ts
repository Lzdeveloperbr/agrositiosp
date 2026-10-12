import { createServerFn } from "@tanstack/react-start";

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type ChatInput = {
  messages: ChatMsg[];
  codigo: string;
  numeroLote?: string;
};

export const chatAgroIA = createServerFn({ method: "POST" })
  .inputValidator((d: ChatInput) => {
    if (!d || !Array.isArray(d.messages) || d.messages.length === 0)
      throw new Error("messages obrigatório");
    if (d.messages.length > 200 || JSON.stringify(d.messages).length > 120000)
      throw new Error("Conversa muito longa. Inicie uma nova conversa.");
    for (const m of d.messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) throw new Error("role inválido");
      if (typeof m.content !== "string" || m.content.length === 0)
        throw new Error("conteúdo vazio");
      if (m.content.length > 6000) throw new Error("mensagem muito longa");
    }
    if (typeof d.codigo !== "string" || !d.codigo.trim() || d.codigo.length > 80)
      throw new Error("Entre na granja antes de consultar a IA.");
    if (
      d.numeroLote !== undefined &&
      (typeof d.numeroLote !== "string" || d.numeroLote.length > 80)
    )
      throw new Error("Lote inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { answerPoultry } = await import("./poultry-assistant.server");
    return answerPoultry(data);
  });
