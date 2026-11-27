import { describe, expect, it } from "vitest";
import {
  mesclarEntry,
  patchMedicao,
  quedaAgua,
  validarLancamento,
  type FormLancamento,
} from "./lancamento-rapido";
import type { Lote } from "./types";

const vazio: FormLancamento = {
  data: "2026-11-20",
  mortalidade: null,
  eliminados: null,
  pesoMedioG: null,
  temperatura_c: null,
  umidade_pct: null,
  consumo_agua_l: null,
  consumo_racao_kg: null,
  uniformidade_pct: null,
  observacoes: "",
};
const lote: Lote = {
  id: "l",
  numero: "1",
  dataEntrada: "2026-11-01",
  quantidadeInicial: 100,
  integradora: "",
  previsaoAbateDias: 42,
  percentualLucro: 0,
  entries: [{ date: "2026-11-20", mortalidade: 3, pesoMedioG: 900 }],
};

describe("lançamento rápido", () => {
  it("requires some data and a valid date", () => {
    expect(validarLancamento(vazio, lote, "2026-11-21")).toContain("Informe ao menos um dado.");
    expect(
      validarLancamento({ ...vazio, data: "2026-11-22", mortalidade: 1 }, lote, "2026-11-21")[0],
    ).toMatch(/data/);
    expect(validarLancamento({ ...vazio, temperatura_c: 28 }, lote, "2026-11-21")).toEqual([]);
  });

  it("rejects losses above housed birds and out-of-range values", () => {
    expect(validarLancamento({ ...vazio, mortalidade: 101 }, lote, "2026-11-21")).toContain(
      "As baixas ultrapassam as aves alojadas.",
    );
    expect(validarLancamento({ ...vazio, umidade_pct: 120 }, lote, "2026-11-21")).toContain(
      "Umidade entre 0 e 100%",
    );
    expect(validarLancamento({ ...vazio, mortalidade: 1.5 }, lote, "2026-11-21").length).toBe(1);
  });

  it("merges the day without wiping fields that were not informed", () => {
    const r = mesclarEntry(lote.entries, { ...vazio, eliminados: 2 }, "T");
    expect(r.mudou).toBe(true);
    expect(r.entries[0]).toEqual({
      date: "2026-11-20",
      mortalidade: 3,
      pesoMedioG: 900,
      eliminados: 2,
      registradoEm: "T",
    });
    expect(mesclarEntry(lote.entries, { ...vazio, mortalidade: 3 }).mudou).toBe(false);
    expect(mesclarEntry(lote.entries, { ...vazio, temperatura_c: 30 }).mudou).toBe(false);
  });

  it("only sends informed measurement fields", () => {
    expect(patchMedicao({ ...vazio, temperatura_c: 0, consumo_agua_l: 4000 })).toEqual({
      temperatura_c: 0,
      consumo_agua_l: 4000,
    });
  });

  it("detects day-over-day water drop only on consecutive days", () => {
    const q = quedaAgua(
      [
        { data: "2026-11-20", consumo_agua_l: 3600 },
        { data: "2026-11-19", consumo_agua_l: 4000 },
      ],
      "2026-11-20",
    );
    expect(q?.pct).toBeCloseTo(-10);
    expect(
      quedaAgua(
        [
          { data: "2026-11-20", consumo_agua_l: 3600 },
          { data: "2026-11-17", consumo_agua_l: 4000 },
        ],
        "2026-11-20",
      ),
    ).toBeNull();
    expect(quedaAgua([{ data: "2026-11-20", consumo_agua_l: null }], "2026-11-20")).toBeNull();
  });
});
