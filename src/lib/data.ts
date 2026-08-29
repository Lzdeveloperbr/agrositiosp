// ===== Datas seguras (fuso horário local) =====
// Motivo: `new Date("2026-08-27")` é interpretado como MEIA-NOITE UTC, e no Brasil
// (UTC-3) isso vira 26/08 21:00 → a tela mostrava sempre 1 DIA A MENOS.
// E `new Date().toISOString().slice(0,10)` grava o dia SEGUINTE depois das 21h.
// Todas as datas do app passam por aqui.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converte qualquer valor em Date no fuso local (date-only nunca desloca). */
export function parseData(v: string | number | Date | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  const m = DATE_ONLY.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD no fuso LOCAL (substitui toISOString().slice(0,10)). */
export function isoLocal(v?: string | number | Date | null): string {
  const d = parseData(v ?? new Date());
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Data de hoje em YYYY-MM-DD (local). */
export const hojeISO = (): string => isoLocal(new Date());

/** Formata para pt-BR sem deslocar o dia. Vazio/inválido → "—". */
export function fmtData(
  v: string | number | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = parseData(v);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", opts);
}

/** Data + hora em pt-BR. */
export function fmtDataHora(v: string | number | Date | null | undefined): string {
  const d = parseData(v);
  if (!d) return "—";
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Soma dias a uma data ISO e devolve YYYY-MM-DD local. */
export function addDias(v: string | Date, n: number): string {
  const d = parseData(v);
  if (!d) return "";
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return isoLocal(x);
}

/** Diferença em dias inteiros entre duas datas (b - a). Ignora horas. */
export function diffDias(a: string | Date | null | undefined, b: string | Date | null | undefined = new Date()): number {
  const da = parseData(a);
  const db = parseData(b);
  if (!da || !db) return 0;
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** Idade do lote/animal em dias (D0 = dia da entrada). */
export const idadeDias = (entrada: string | Date | null | undefined): number =>
  Math.max(0, diffDias(entrada, new Date()));
