import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import type { DailyEntry } from "@/lib/types";

export type AmostraAve = NonNullable<DailyEntry["amostraPesagem"]>[number];

/** Amostra recomendada: 1% das aves vivas, no mínimo 50 e no máximo 200. */
export function tamanhoAmostra(avesVivas: number) {
  return Math.max(50, Math.min(200, Math.ceil(avesVivas * 0.01)));
}

/** Histograma em faixas de 5% da média (−25% a +25%), marcando a faixa de uniformidade (±10%). */
export function histograma(pesos: number[]) {
  if (!pesos.length) return [];
  const media = pesos.reduce((s, p) => s + p, 0) / pesos.length;
  const faixas = Array.from({ length: 10 }, (_, i) => ({
    de: -25 + i * 5,
    ate: -20 + i * 5,
    n: 0,
  }));
  for (const p of pesos) {
    const d = ((p - media) / media) * 100;
    const i = Math.min(9, Math.max(0, Math.floor((d + 25) / 5)));
    faixas[i].n++;
  }
  return faixas.map((f) => ({ ...f, uniforme: f.de >= -10 && f.ate <= 10 }));
}

/** Mescla a pesagem no dia preservando baixas e observações. */
export function mesclarPesagem(
  entries: DailyEntry[],
  data: string,
  amostras: AmostraAve[],
  operador: string | null,
  agoraISO = new Date().toISOString(),
) {
  const media = amostras.reduce((s, a) => s + a.pesoG, 0) / amostras.length;
  const existente = entries.find((e) => e.date === data);
  const entrada: DailyEntry = {
    ...(existente ?? { date: data, mortalidade: 0 }),
    date: data,
    pesoMedioG: Math.round(media * 100) / 100,
    amostraPesagem: amostras,
    ...(operador ? { operadorPesagem: operador } : {}),
    registradoEm: agoraISO,
  };
  // Sem lançamento no dia, cria o registro com mortalidade 0 (mesmo comportamento anterior da tela).
  return [...entries.filter((e) => e.date !== data), entrada].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/** Grava com controle de concorrência (updated_at): relê e mescla se outro aparelho salvou antes. */
export async function salvarPesagemNuvem(
  client: SupabaseClient,
  loteId: string,
  data: string,
  amostras: AmostraAve[],
  operador: string | null,
) {
  for (let i = 0; i < 3; i++) {
    const { data: row, error } = await client
      .from("lotes")
      .select("*")
      .eq("id", loteId)
      .maybeSingle();
    if (error) return { ok: false as const, erro: error.message };
    if (!row) return { ok: false as const, erro: "Lote não encontrado." };
    if ((row as { encerrado?: boolean }).encerrado)
      return { ok: false as const, erro: "Lote encerrado: alterações bloqueadas." };
    const entries = (Array.isArray(row.entries) ? row.entries : []) as DailyEntry[];
    const { data: gravado, error: e2 } = await client
      .from("lotes")
      .update({
        entries: mesclarPesagem(entries, data, amostras, operador) as unknown as Json,
        autor: operador,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loteId)
      .eq("updated_at", row.updated_at)
      .select("*")
      .maybeSingle();
    if (e2) return { ok: false as const, erro: e2.message };
    if (gravado) return { ok: true as const, row: gravado as Record<string, unknown> };
  }
  return {
    ok: false as const,
    erro: "Outro lançamento atualizou o lote ao mesmo tempo. Tente salvar de novo.",
  };
}
