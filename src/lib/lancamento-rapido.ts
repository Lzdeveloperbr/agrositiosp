import type { DailyEntry, Lote } from "@/lib/types";

/**
 * Lançamento rápido do dia: mesma semântica da API do bot — só os campos informados são
 * alterados, nada é zerado silenciosamente, e as medições vão para `lote_medicoes`
 * (uma linha por lote e dia), enquanto baixas e peso ficam em `lotes.entries`.
 */

export type FormLancamento = {
  data: string;
  mortalidade: number | null;
  eliminados: number | null;
  pesoMedioG: number | null;
  temperatura_c: number | null;
  umidade_pct: number | null;
  consumo_agua_l: number | null;
  consumo_racao_kg: number | null;
  uniformidade_pct: number | null;
  observacoes: string;
};

export const CAMPOS_MEDICAO = [
  "temperatura_c",
  "umidade_pct",
  "consumo_agua_l",
  "consumo_racao_kg",
  "uniformidade_pct",
] as const;
export type CampoMedicao = (typeof CAMPOS_MEDICAO)[number];

const LIMITES: Record<CampoMedicao | "pesoMedioG", [number, number, string]> = {
  temperatura_c: [-20, 70, "Temperatura entre −20 e 70 °C"],
  umidade_pct: [0, 100, "Umidade entre 0 e 100%"],
  consumo_agua_l: [0, 10_000_000, "Consumo de água inválido"],
  consumo_racao_kg: [0, 1_000_000, "Consumo de ração inválido"],
  uniformidade_pct: [0, 100, "Uniformidade entre 0 e 100%"],
  pesoMedioG: [20, 6000, "Peso médio entre 20 g e 6.000 g"],
};

export function validarLancamento(f: FormLancamento, lote: Lote, hoje: string): string[] {
  const erros: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data) || f.data < lote.dataEntrada || f.data > hoje)
    erros.push("A data deve estar entre o alojamento e hoje.");
  if (lote.encerrado) erros.push("Lote encerrado: alterações bloqueadas.");
  for (const k of ["mortalidade", "eliminados"] as const) {
    const v = f[k];
    if (v !== null && (!Number.isInteger(v) || v < 0))
      erros.push("Mortalidade e eliminados devem ser números inteiros a partir de 0.");
  }
  for (const k of [...CAMPOS_MEDICAO, "pesoMedioG"] as const) {
    const v = f[k];
    const [min, max, msg] = LIMITES[k];
    if (v !== null && (!Number.isFinite(v) || v < min || v > max)) erros.push(msg);
  }
  const algo =
    f.mortalidade !== null ||
    f.eliminados !== null ||
    f.pesoMedioG !== null ||
    f.observacoes.trim() !== "" ||
    CAMPOS_MEDICAO.some((k) => f[k] !== null);
  if (!algo) erros.push("Informe ao menos um dado.");
  if (!erros.length) {
    const entries = mesclarEntry(lote.entries ?? [], f).entries;
    const total = entries.reduce(
      (s, e) => s + (Number(e.mortalidade) || 0) + (Number(e.eliminados) || 0),
      0,
    );
    if (total > lote.quantidadeInicial) erros.push("As baixas ultrapassam as aves alojadas.");
  }
  return [...new Set(erros)];
}

/** Mescla o dia sem apagar campos não informados. `mudou` evita gravações sem efeito. */
export function mesclarEntry(
  entries: DailyEntry[],
  f: FormLancamento,
  agoraISO = new Date().toISOString(),
) {
  const prev = entries.find((e) => e.date === f.data);
  const patch: Partial<DailyEntry> = {
    ...(f.mortalidade !== null && { mortalidade: f.mortalidade }),
    ...(f.eliminados !== null && { eliminados: f.eliminados }),
    ...(f.pesoMedioG !== null && { pesoMedioG: f.pesoMedioG }),
    ...(f.observacoes.trim() && { observacoes: f.observacoes.trim() }),
  };
  const next: DailyEntry = {
    ...(prev ?? { date: f.data, mortalidade: 0 }),
    ...patch,
    date: f.data,
  };
  const { registradoEm: _a, ...semA } = prev ?? ({} as DailyEntry);
  const { registradoEm: _b, ...semB } = next;
  const mudou = Object.keys(patch).length > 0 && JSON.stringify(semA) !== JSON.stringify(semB);
  if (!mudou) return { entries, mudou: false };
  return {
    mudou: true,
    entries: [
      ...entries.filter((e) => e.date !== f.data),
      { ...next, registradoEm: agoraISO },
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Só os campos de medição informados (null = não mexer). */
export function patchMedicao(f: FormLancamento) {
  const out: Partial<Record<CampoMedicao, number>> = {};
  for (const k of CAMPOS_MEDICAO) if (f[k] !== null) out[k] = f[k] as number;
  return out;
}

/** Queda de água de um dia para o outro: sinal precoce de problema. */
export function quedaAgua(
  medicoes: { data: string; consumo_agua_l: number | null }[],
  hoje: string,
) {
  const comAgua = medicoes
    .filter((m) => m.data <= hoje && m.consumo_agua_l !== null && m.consumo_agua_l > 0)
    .sort((a, b) => b.data.localeCompare(a.data));
  const [ult, ant] = comAgua;
  if (!ult || !ant) return null;
  const dias = Math.round((Date.parse(ult.data) - Date.parse(ant.data)) / 86400000);
  if (dias !== 1) return null; // só compara dias consecutivos
  const pct = ((ult.consumo_agua_l! - ant.consumo_agua_l!) / ant.consumo_agua_l!) * 100;
  return { data: ult.data, pct, litros: ult.consumo_agua_l!, anterior: ant.consumo_agua_l! };
}
