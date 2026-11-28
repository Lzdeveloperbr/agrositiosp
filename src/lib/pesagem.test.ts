import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { histograma, mesclarPesagem, salvarPesagemNuvem, tamanhoAmostra } from "./pesagem";

const am = (pesos: number[]) =>
  pesos.map((p, i) => ({ id: String(i), sexo: "misto" as const, pesoG: p }));

describe("pesagem", () => {
  it("recommends 1% of live birds between 50 and 200", () => {
    expect(tamanhoAmostra(3000)).toBe(50);
    expect(tamanhoAmostra(12000)).toBe(120);
    expect(tamanhoAmostra(40000)).toBe(200);
  });

  it("builds a histogram around the mean with the ±10% band marked", () => {
    const h = histograma([900, 1000, 1000, 1100, 700]);
    expect(h.reduce((s, f) => s + f.n, 0)).toBe(5);
    expect(h.filter((f) => f.uniforme).map((f) => f.de)).toEqual([-10, -5, 0, 5]);
  });

  it("merges the weighing into the day keeping losses and notes", () => {
    const r = mesclarPesagem(
      [{ date: "2026-11-20", mortalidade: 4, eliminados: 1, observacoes: "ok" }],
      "2026-11-20",
      am([1000, 1100]),
      "Ana",
      "T",
    );
    expect(r[0]).toMatchObject({
      mortalidade: 4,
      eliminados: 1,
      observacoes: "ok",
      pesoMedioG: 1050,
      operadorPesagem: "Ana",
      registradoEm: "T",
    });
    expect(r[0].amostraPesagem).toHaveLength(2);
  });

  it("retries on concurrent update and saves on top of the latest entries", async () => {
    let versao = "v1";
    let entries: unknown[] = [{ date: "2026-11-19", mortalidade: 2 }];
    let conflito = true;
    const client = {
      from: () => {
        const f: Record<string, unknown> = {};
        let op = "select";
        let payload: any;
        const b: any = {
          select: () => b,
          update: (p: unknown) => ((op = "update"), (payload = p), b),
          eq: (k: string, v: unknown) => ((f[k] = v), b),
          maybeSingle: async () => {
            if (op === "select")
              return {
                data: { id: "L", entries, updated_at: versao, encerrado: false },
                error: null,
              };
            if (conflito) {
              conflito = false;
              entries = [...entries, { date: "2026-11-20", mortalidade: 3 }];
              versao = "v2";
              return { data: null, error: null };
            }
            if (f.updated_at !== versao) return { data: null, error: null };
            entries = payload.entries;
            return { data: { id: "L", entries }, error: null };
          },
        };
        return b;
      },
    } as unknown as SupabaseClient;
    const r = await salvarPesagemNuvem(client, "L", "2026-11-20", am([1200]), null);
    expect(r.ok).toBe(true);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ date: "2026-11-20", mortalidade: 3, pesoMedioG: 1200 });
  });
});
