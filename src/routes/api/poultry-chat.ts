import { createFileRoute } from "@tanstack/react-router";
import { validateUIMessages } from "ai";
import { z } from "zod";

export const Route = createFileRoute("/api/poultry-chat")({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const raw = await request.text();
      if (raw.length > 160000) return Response.json({ message: "Conversa muito longa. Limpe o histórico." }, { status: 400 });
      const input = z.object({
        codigo: z.string().trim().min(1).max(80),
        numeroLote: z.string().max(80).optional(),
        messages: z.array(z.object({ id: z.string(), role: z.enum(["user", "assistant"]), parts: z.array(z.unknown()) }).passthrough()).min(1).max(200),
      }).parse(JSON.parse(raw));
      const messages = await validateUIMessages({ messages: input.messages });
      const { streamPoultry } = await import("@/lib/poultry-assistant.server");
      return await streamPoultry({ ...input, messages }, request.signal);
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      const message = error instanceof Error && !(error instanceof z.ZodError) ? error.message : "Pergunta ou código da granja inválido.";
      return Response.json({ message }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
  } } },
});