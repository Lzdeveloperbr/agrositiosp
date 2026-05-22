import { createServerFn } from "@tanstack/react-start";

export type OcrNotaInput = { imagem: string };
export type OcrNotaResult = {
  motorista?: string;
  placa?: string;
  viagem?: string;
  quantidadeKg?: number;
  cliente?: string;
  tipoRacao?: string;
  data?: string;
  bruto?: string;
};

export const ocrNotaRacao = createServerFn({ method: "POST" })
  .inputValidator((d: OcrNotaInput) => {
    if (!d || typeof d.imagem !== "string") throw new Error("imagem obrigatória");
    if (!d.imagem.startsWith("data:image/")) throw new Error("imagem inválida");
    if (d.imagem.length > 4_000_000) throw new Error("imagem grande demais (>3MB)");
    return d;
  })
  .handler(async ({ data }): Promise<OcrNotaResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const system = `Você é um OCR especializado em notas/comprovantes de entrega de ração para granjas.
Analise a imagem e extraia EXATAMENTE estes campos quando estiverem visíveis. Retorne SOMENTE um JSON válido (sem markdown, sem comentário, sem prefixo) com este formato:
{"motorista": "string|null", "placa": "string|null", "viagem": "string|null", "quantidadeKg": numero|null, "cliente": "string|null", "tipoRacao": "string|null", "data": "YYYY-MM-DD|null"}
Regras:
- "quantidadeKg" sempre em kg (se vier em ton, multiplique por 1000).
- "placa" no formato brasileiro (ex: ABC1D23 ou ABC-1234).
- "data" no formato ISO YYYY-MM-DD.
- Use null quando o campo não estiver visível ou não tiver certeza.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os campos desta nota:" },
              { type: "image_url", image_url: { url: data.imagem } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Limite de IA atingido — tente novamente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!res.ok) throw new Error(`Falha OCR (${res.status})`);

    const j: any = await res.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    let parsed: any = {};
    try {
      const match = clean.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }
    return {
      motorista: parsed.motorista ?? undefined,
      placa: parsed.placa ?? undefined,
      viagem: parsed.viagem ? String(parsed.viagem) : undefined,
      quantidadeKg: typeof parsed.quantidadeKg === "number" ? parsed.quantidadeKg : undefined,
      cliente: parsed.cliente ?? undefined,
      tipoRacao: parsed.tipoRacao ?? undefined,
      data: parsed.data ?? undefined,
      bruto: raw.slice(0, 500),
    };
  });
