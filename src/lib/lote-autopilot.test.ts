import { describe, expect, it } from "vitest";
import {
  calcularAutopilot,
  calcularIEP,
  classificarTermico,
  refMortalidadeAcumPct,
} from "./lote-autopilot";
import { calcularResumoLote } from "./granja";
import type { Lote } from "./types";

const hoje = "2026-11-20";
const base = (entries: Lote["entries"]): Lote => ({
  id: "l1",
  numero: "7",
  dataEntrada: "2026-10-30",
  quantidadeInicial: 20000,
  integradora: "X",
  previsaoAbateDias: 42,
  percentualLucro: 0,
  entries,
});
const resumoDe = (lote: Lote) =>
  calcularResumoLote(lote, "ross_ap95", "misto", new Date(2026, 10, 20, 12));

describe("lote autopilot", () => {
  it("classifies house temperature by age", () => {
    expect(classificarTermico(null, 10)).toBe("sem_dado");
    expect(classificarTermico(32, 3)).toBe("conforto");
    expect(classificarTermico(27, 30)).toBe("estresse");
    expect(classificarTermico(18, 30)).toBe("frio");
  });

  it("computes IEP and rejects invalid inputs", () => {
    expect(calcularIEP(96, 2.8, 42, 1.7)).toBe(376);
    expect(calcularIEP(96, 2.8, 0, 1.7)).toBeNull();
  });

  it("mortality reference grows ~1% first week", () => {
    expect(refMortalidadeAcumPct(7)).toBeCloseTo(1);
    expect(refMortalidadeAcumPct(42)).toBeCloseTo(3.8);
  });

  it("excludes missing components instead of assuming zero", () => {
    const lote = base([{ date: hoje, mortalidade: 5 }]);
    const r = calcularAutopilot({ lote, resumo: resumoDe(lote), medicoes: [], silo: null, hoje });
    expect(r.componentes.find((c) => c.id === "ambiencia")?.nota).toBeNull();
    expect(r.componentes.find((c) => c.id === "silo")?.nota).toBeNull();
    expect(r.indice).not.toBeNull();
    expect(r.galpao.termico).toBe("sem_dado");
    expect(r.acoes.some((a) => a.id === "medir")).toBe(true);
    expect(r.acoes.some((a) => a.id === "diario")).toBe(false);
  });

  it("flags heat stress, high daily losses and missing diary, critical first", () => {
    const lote = base([{ date: "2026-11-19", mortalidade: 60 }]);
    const r = calcularAutopilot({
      lote,
      resumo: resumoDe(lote),
      hoje,
      silo: null,
      medicoes: [
        {
          data: hoje,
          temperatura_c: 31,
          umidade_pct: 60,
          consumo_agua_l: 100,
          consumo_racao_kg: 100,
          uniformidade_pct: null,
        },
      ],
    });
    const ids = r.acoes.map((a) => a.id);
    expect(ids).toContain("calor-critico");
    expect(ids).toContain("mortalidade-dia");
    expect(ids).toContain("diario");
    expect(ids).toContain("agua-baixa");
    expect(r.acoes[0].prioridade).toBe("critica");
    expect(r.galpao.ventilacao).toBe(1);
  });

  it("ignores stale measurements as current house conditions", () => {
    const lote = base([{ date: hoje, mortalidade: 0 }]);
    const r = calcularAutopilot({
      lote,
      resumo: resumoDe(lote),
      hoje,
      silo: null,
      medicoes: [
        {
          data: "2026-11-10",
          temperatura_c: 35,
          umidade_pct: 60,
          consumo_agua_l: null,
          consumo_racao_kg: null,
          uniformidade_pct: null,
        },
      ],
    });
    expect(r.galpao.temperaturaC).toBeNull();
    expect(r.galpao.medicaoData).toBe("2026-11-10");
  });

  it("warns about a day-over-day water drop", () => {
    const lote = base([{ date: hoje, mortalidade: 0 }]);
    const m = (data: string, agua: number) => ({
      data,
      temperatura_c: null,
      umidade_pct: null,
      consumo_agua_l: agua,
      consumo_racao_kg: null,
      uniformidade_pct: null,
    });
    const r = calcularAutopilot({
      lote,
      resumo: resumoDe(lote),
      hoje,
      silo: null,
      medicoes: [m(hoje, 3500), m("2026-11-19", 4000)],
    });
    const a = r.acoes.find((x) => x.id === "agua-queda");
    expect(a?.prioridade).toBe("alta");
    expect(a?.titulo).toContain("12,5%");
  });
});
