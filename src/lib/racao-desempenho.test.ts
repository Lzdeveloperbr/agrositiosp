import { describe, expect, it } from "vitest";
import { calcularFases, CORTES_PADRAO, diagnosticarDesempenho } from "./racao-desempenho";

// Consumo sintético: 1.000 kg por dia, uniforme.
const porDia = 1000;
const integrar = (t0: Date, t1: Date) =>
  Math.max(0, ((t1.getTime() - t0.getTime()) / 86400000) * porDia);

describe("fases de ração", () => {
  const base = {
    alojamento: "2026-11-01",
    abateDias: 42,
    cortes: CORTES_PADRAO,
    tRuptura: null as Date | null,
    integrarConsumo: integrar,
  };

  it("identifies current phase, next change and remaining kg", () => {
    const r = calcularFases({ ...base, agora: new Date(2026, 10, 19, 0, 0), estoqueAtualKg: 5000 }); // D18
    expect(r.atual?.nome).toBe("Inicial");
    expect(r.proxima?.nome).toBe("Crescimento");
    expect(r.diasParaTroca).toBe(4); // termina no fim do D21
    expect(r.atual?.kgRestante).toBeCloseTo(4000);
    expect(r.sobraFaseAtualKg).toBeCloseTo(1000);
    expect(r.fases.map((f) => f.status)).toEqual(["concluida", "atual", "futura", "futura"]);
    expect(r.fases.at(-1)?.fimDia).toBe(42);
    expect(r.restanteLoteKg).toBeCloseTo(25000);
    expect(r.aComprarKg).toBeCloseTo(20000);
  });

  it("next load uses the phase active when the silo runs out", () => {
    const r = calcularFases({
      ...base,
      agora: new Date(2026, 10, 19),
      estoqueAtualKg: 5000,
      tRuptura: new Date(2026, 10, 24, 12),
    });
    expect(r.faseProximaCarga?.nome).toBe("Crescimento");
  });

  it("drops phases after slaughter age", () => {
    const r = calcularFases({
      ...base,
      abateDias: 30,
      agora: new Date(2026, 10, 3),
      estoqueAtualKg: 0,
    });
    expect(r.fases.map((f) => f.nome)).toEqual(["Pré-inicial", "Inicial", "Crescimento"]);
    expect(r.fases.at(-1)?.fimDia).toBe(30);
  });
});

describe("diagnóstico de conversão", () => {
  const base = {
    difPesoPct: 0,
    consumoMedido: true,
    difConsumoPct: 0,
    caEstimada: 1.5,
    caRef: 1.5,
    gpd7: 90,
    gpdRef: 90,
    mortalidadePct: 2,
    mortalidadeRefPct: 2.5,
    kgVivoAbate: 60000,
    precoRacaoKg: 2.5,
  };

  it("separates low intake from poor conversion only when intake is measured", () => {
    expect(
      diagnosticarDesempenho({ ...base, difPesoPct: -8, difConsumoPct: -9 }).causas[0].id,
    ).toBe("baixo-consumo");
    expect(diagnosticarDesempenho({ ...base, difPesoPct: -8, difConsumoPct: 2 }).causas[0].id).toBe(
      "ma-conversao",
    );
    const est = diagnosticarDesempenho({
      ...base,
      difPesoPct: -8,
      difConsumoPct: 2,
      consumoMedido: false,
    });
    expect(est.causas[0].id).toBe("peso-baixo");
    expect(est.deltaCA).toBeNull();
  });

  it("prices each 0.01 of feed conversion", () => {
    const r = diagnosticarDesempenho({ ...base, caEstimada: 1.55 });
    expect(r.kgPorCentesimo).toBe(600);
    expect(r.reaisPorCentesimo).toBe(1500);
    expect(r.custoDesvioCA).toBeCloseTo(7500);
    expect(r.causas[0].id).toBe("ok");
  });
});
