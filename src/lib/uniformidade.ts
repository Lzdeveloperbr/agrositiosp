import { diffDias } from "@/lib/data";
import type { DailyEntry } from "@/lib/types";

/** Uniformidade (% das aves a ±10% da média) e CV de uma amostra de pesagem. */
export function estatisticaAmostra(pesos: number[]) {
  const n = pesos.length;
  if (!n) return null;
  const media = pesos.reduce((s, p) => s + p, 0) / n;
  const desvio = n > 1 ? Math.sqrt(pesos.reduce((s, p) => s + (p - media) ** 2, 0) / (n - 1)) : 0;
  return {
    n,
    media,
    desvio,
    uniformidadePct: media
      ? (100 * pesos.filter((p) => Math.abs(p - media) <= media * 0.1).length) / n
      : 0,
    cvPct: media ? (100 * desvio) / media : 0,
  };
}

/** Última amostra individual registrada (até `maxDias` atrás), com pelo menos `minAves`. */
export function uniformidadeRecente(
  entries: DailyEntry[],
  hoje: string,
  maxDias = 7,
  minAves = 20,
) {
  const e = [...entries]
    .filter((x) => x.date <= hoje && (x.amostraPesagem?.length ?? 0) >= minAves)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!e || diffDias(e.date, hoje) > maxDias) return null;
  const est = estatisticaAmostra(
    e.amostraPesagem!.map((a) => Number(a.pesoG)).filter((p) => p > 0),
  );
  return est ? { ...est, data: e.date } : null;
}
