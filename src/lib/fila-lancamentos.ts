import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import type { DailyEntry, Lote } from "@/lib/types";
import { hojeISO } from "@/lib/data";
import {
  mesclarEntry,
  patchMedicao,
  validarLancamento,
  CAMPOS_MEDICAO,
  type FormLancamento,
} from "@/lib/lancamento-rapido";

/**
 * Fila de lançamentos do dia. Todo lançamento passa por ela: é gravado no aparelho e
 * enviado na hora; sem sinal, fica pendente e é reenviado quando a conexão volta.
 * Só guarda o que o usuário digitou e ainda não chegou à nuvem — nada é cacheado.
 */

export type ItemFila = {
  id: string;
  loteId: string;
  loteNumero: string;
  form: FormLancamento;
  criadoEm: string;
  tentativas: number;
  erro?: string;
};

export const EVENTO_FILA = "fila-lancamentos:mudou";
const chave = (fazendaId: string) => `fila-lancamentos:${fazendaId}`;

/** Combina dois lançamentos do mesmo dia: o mais novo vence onde foi preenchido. */
export function mesclarForms(a: FormLancamento, b: FormLancamento): FormLancamento {
  const out = { ...a };
  for (const k of ["mortalidade", "eliminados", "pesoMedioG", ...CAMPOS_MEDICAO] as const)
    if (b[k] !== null) out[k] = b[k];
  if (b.observacoes.trim()) out.observacoes = b.observacoes;
  return out;
}

export function enfileirar(
  fila: ItemFila[],
  item: Omit<ItemFila, "id" | "tentativas" | "criadoEm">,
  agora = new Date().toISOString(),
): ItemFila[] {
  const i = fila.findIndex((x) => x.loteId === item.loteId && x.form.data === item.form.data);
  if (i >= 0) {
    const atual = fila[i];
    const novo = { ...atual, form: mesclarForms(atual.form, item.form), erro: undefined };
    return [...fila.slice(0, i), novo, ...fila.slice(i + 1)];
  }
  return [
    ...fila,
    { ...item, id: `${item.loteId}:${item.form.data}`, tentativas: 0, criadoEm: agora },
  ];
}

export function lerFila(fazendaId: string): ItemFila[] {
  try {
    const v = JSON.parse(localStorage.getItem(chave(fazendaId)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function salvarFila(fazendaId: string, fila: ItemFila[]) {
  try {
    if (fila.length) localStorage.setItem(chave(fazendaId), JSON.stringify(fila));
    else localStorage.removeItem(chave(fazendaId));
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_FILA, { detail: fila.length }));
}

type LoteRow = {
  id: string;
  data_entrada: string;
  quantidade_inicial: number;
  encerrado: boolean | null;
  entries: unknown;
  updated_at: string;
  fazenda_id: string;
};

export type ResultadoEnvio =
  | { ok: true; row: Record<string, unknown> | null }
  | { ok: false; definitivo: boolean; erro: string };

/** Envia um item com controle de concorrência (updated_at), como a API do bot. */
export async function enviarItem(
  client: SupabaseClient,
  item: ItemFila,
  autor: string | null,
): Promise<ResultadoEnvio> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data: row, error } = await client
      .from("lotes")
      .select("*")
      .eq("id", item.loteId)
      .maybeSingle();
    if (error) return { ok: false, definitivo: false, erro: error.message };
    if (!row) return { ok: false, definitivo: true, erro: "Lote não encontrado." };
    const r = row as LoteRow;
    const entries = (Array.isArray(r.entries) ? r.entries : []) as DailyEntry[];
    const lote = {
      dataEntrada: r.data_entrada,
      quantidadeInicial: Number(r.quantidade_inicial),
      encerrado: !!r.encerrado,
      entries,
    } as Lote;
    const erros = validarLancamento(item.form, lote, hojeISO());
    if (erros.length) return { ok: false, definitivo: true, erro: erros[0] };

    let atualizado: Record<string, unknown> | null = row;
    const m = mesclarEntry(entries, item.form);
    if (m.mudou) {
      const { data, error: e2 } = await client
        .from("lotes")
        .update({
          entries: m.entries as unknown as Json,
          autor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id)
        .eq("updated_at", r.updated_at)
        .select("*")
        .maybeSingle();
      if (e2) return { ok: false, definitivo: false, erro: e2.message };
      if (!data) continue; // outro aparelho gravou antes: relê e mescla de novo
      atualizado = data;
    }

    const patch = patchMedicao(item.form);
    if (Object.keys(patch).length) {
      const { data: existente, error: e3 } = await client
        .from("lote_medicoes")
        .select("*")
        .eq("lote_id", r.id)
        .eq("data", item.form.data)
        .maybeSingle();
      if (e3) return { ok: false, definitivo: false, erro: e3.message };
      const muda =
        !existente ||
        Object.entries(patch).some(([k, v]) => (existente as Record<string, unknown>)[k] !== v);
      if (muda) {
        const { error: e4 } = await client
          .from("lote_medicoes")
          .upsert(
            {
              ...(existente ?? {}),
              fazenda_id: r.fazenda_id,
              lote_id: r.id,
              data: item.form.data,
              ...patch,
              autor,
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: "lote_id,data" },
          );
        if (e4) return { ok: false, definitivo: false, erro: e4.message };
      }
    }
    return { ok: true, row: m.mudou ? atualizado : null };
  }
  return {
    ok: false,
    definitivo: false,
    erro: "Outro lançamento atualizou o lote ao mesmo tempo. Nova tentativa em instantes.",
  };
}

let sincronizando = false;

/** Envia toda a fila. Itens com erro definitivo saem da fila; falhas de rede ficam. */
export async function sincronizarFila(
  client: SupabaseClient,
  fazendaId: string,
  autor: string | null,
) {
  if (sincronizando) return { enviados: 0, recusados: [] as ItemFila[] };
  sincronizando = true;
  let enviados = 0;
  const recusados: ItemFila[] = [];
  try {
    for (const item of lerFila(fazendaId)) {
      const r = await enviarItem(client, item, autor);
      const fila = lerFila(fazendaId);
      if (r.ok) {
        enviados++;
        salvarFila(
          fazendaId,
          fila.filter((x) => x.id !== item.id),
        );
        if (r.row)
          window.dispatchEvent(
            new CustomEvent("cloud-row", { detail: { table: "lotes", row: r.row } }),
          );
      } else if (r.definitivo) {
        recusados.push({ ...item, erro: r.erro });
        salvarFila(
          fazendaId,
          fila.filter((x) => x.id !== item.id),
        );
      } else {
        salvarFila(
          fazendaId,
          fila.map((x) =>
            x.id === item.id ? { ...x, tentativas: x.tentativas + 1, erro: r.erro } : x,
          ),
        );
        break; // sem conexão: tenta o resto depois
      }
    }
  } finally {
    sincronizando = false;
  }
  return { enviados, recusados };
}
