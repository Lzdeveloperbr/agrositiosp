import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enfileirar, enviarItem, mesclarForms, type ItemFila } from "./fila-lancamentos";
import type { FormLancamento } from "./lancamento-rapido";
import { addDias, hojeISO } from "./data";

const hoje = hojeISO();
const form = (p: Partial<FormLancamento> = {}): FormLancamento => ({
  data: hoje,
  mortalidade: null,
  eliminados: null,
  pesoMedioG: null,
  temperatura_c: null,
  umidade_pct: null,
  consumo_agua_l: null,
  consumo_racao_kg: null,
  uniformidade_pct: null,
  observacoes: "",
  ...p,
});

describe("fila de lançamentos", () => {
  it("merges two entries for the same lot and day, newest filled value wins", () => {
    const m = mesclarForms(
      form({ mortalidade: 3, temperatura_c: 28 }),
      form({ temperatura_c: 30, consumo_agua_l: 4000 }),
    );
    expect(m).toMatchObject({ mortalidade: 3, temperatura_c: 30, consumo_agua_l: 4000 });
    let f: ItemFila[] = [];
    f = enfileirar(f, { loteId: "a", loteNumero: "1", form: form({ mortalidade: 3 }) });
    f = enfileirar(f, { loteId: "a", loteNumero: "1", form: form({ eliminados: 1 }) });
    f = enfileirar(f, { loteId: "b", loteNumero: "2", form: form({ mortalidade: 1 }) });
    expect(f).toHaveLength(2);
    expect(f[0].form).toMatchObject({ mortalidade: 3, eliminados: 1 });
  });
});

// Nuvem falsa mínima: simula o select/update/upsert usados pelo envio.
function nuvem(opts: { conflitos: number; semRede?: boolean }) {
  const estado = {
    lote: {
      id: "L",
      fazenda_id: "F",
      data_entrada: addDias(hoje, -20),
      quantidade_inicial: 1000,
      encerrado: false,
      entries: [] as unknown[],
      updated_at: "v1",
    },
    medicao: null as Record<string, unknown> | null,
    updates: 0,
  };
  let conflitos = opts.conflitos;
  const client = {
    from(table: string) {
      const q: { op: string; payload?: Record<string, unknown>; filtros: Record<string, unknown> } =
        { op: "select", filtros: {} };
      const b = {
        select: () => b,
        update: (p: Record<string, unknown>) => ((q.op = "update"), (q.payload = p), b),
        upsert: (p: Record<string, unknown>) => (
          (q.op = "upsert"),
          (q.payload = p),
          Promise.resolve({ error: null }).then((r) => ((estado.medicao = p), r))
        ),
        eq: (k: string, v: unknown) => ((q.filtros[k] = v), b),
        maybeSingle: async () => {
          if (opts.semRede) return { data: null, error: { message: "Failed to fetch" } };
          if (table === "lote_medicoes") return { data: estado.medicao, error: null };
          if (q.op === "update") {
            estado.updates++;
            if (conflitos > 0) {
              conflitos--;
              estado.lote.updated_at = `v${estado.updates + 1}`;
              return { data: null, error: null };
            }
            if (q.filtros.updated_at !== estado.lote.updated_at) return { data: null, error: null };
            estado.lote = { ...estado.lote, ...(q.payload as object), updated_at: "novo" };
            return { data: estado.lote, error: null };
          }
          return { data: estado.lote, error: null };
        },
      };
      return b;
    },
  } as unknown as SupabaseClient;
  return { client, estado };
}

const item = (f: FormLancamento): ItemFila => ({
  id: "x",
  loteId: "L",
  loteNumero: "1",
  form: f,
  criadoEm: "",
  tentativas: 0,
});

describe("envio para a nuvem", () => {
  it("writes the entry and the measurement", async () => {
    const { client, estado } = nuvem({ conflitos: 0 });
    const r = await enviarItem(client, item(form({ mortalidade: 2, temperatura_c: 29 })), "Ana");
    expect(r.ok).toBe(true);
    expect(estado.lote.entries).toHaveLength(1);
    expect(estado.medicao).toMatchObject({
      temperatura_c: 29,
      lote_id: "L",
      data: hoje,
      autor: "Ana",
    });
  });

  it("re-reads and retries when another device saved first", async () => {
    const { client, estado } = nuvem({ conflitos: 1 });
    const r = await enviarItem(client, item(form({ mortalidade: 2 })), null);
    expect(r.ok).toBe(true);
    expect(estado.updates).toBe(2);
  });

  it("keeps the item on network failure and drops it on validation failure", async () => {
    const off = await enviarItem(
      nuvem({ conflitos: 0, semRede: true }).client,
      item(form({ mortalidade: 1 })),
      null,
    );
    expect(off).toMatchObject({ ok: false, definitivo: false });
    const ruim = await enviarItem(
      nuvem({ conflitos: 0 }).client,
      item(form({ mortalidade: 5000 })),
      null,
    );
    expect(ruim).toMatchObject({ ok: false, definitivo: true });
  });

  it("treats a thrown network error as temporary and keeps the queue", async () => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => (store[k] = v),
      removeItem: (k: string) => delete store[k],
    };
    (globalThis as any).window = { dispatchEvent: () => true };
    (globalThis as any).CustomEvent = class {
      constructor(
        public type: string,
        public init?: unknown,
      ) {}
    };
    const { salvarFila, sincronizarFila, lerFila } = await import("./fila-lancamentos");
    salvarFila("F", [item(form({ mortalidade: 1 }))]);
    const quebra = {
      from: () => {
        throw new TypeError("Failed to fetch");
      },
    } as unknown as SupabaseClient;
    const r = await sincronizarFila(quebra, "F", null);
    expect(r.enviados).toBe(0);
    expect(lerFila("F")).toHaveLength(1);
    expect(lerFila("F")[0].tentativas).toBe(1);
  });
});
