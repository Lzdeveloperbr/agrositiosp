import { describe, expect, it } from "vitest";
import { dimensionar, planejarCarregamento, simularAbate } from "./planejamento-abate";
import { refPesoG } from "./silo";

const base = {
  idadeAtual: 30,
  avesVivas: 19500,
  avesAlojadas: 20000,
  linhagem: "ross_ap95" as const,
  sexo: "misto" as const,
  projetarPesoG: (d: number) => refPesoG(d, "ross_ap95", "misto"),
  precoKgVivo: 5.5,
  precoRacaoKg: 2.4,
  outrosCustos: 60000,
  vazioDias: 14,
  areaM2: 0,
  limiteKgM2: 39,
};

describe("planejamento de abate", () => {
  it("simulates from today onward with decreasing birds and growing weight", () => {
    const r = simularAbate(base);
    expect(r.dias[0].idade).toBe(30);
    expect(r.dias.at(-1)?.idade).toBe(56);
    expect(r.dias[5].aves).toBeLessThan(r.dias[0].aves);
    expect(r.dias[5].pesoG).toBeGreaterThan(r.dias[0].pesoG);
    expect(r.melhorMargemDia).not.toBeNull();
    expect(r.limiteDensidade).toBeNull();
  });

  it("respects the density limit when the house area is known", () => {
    const r = simularAbate({ ...base, areaM2: 1200 });
    expect(r.limiteDensidade).not.toBeNull();
    expect(r.melhorMargemDia!.idade).toBeLessThan(r.limiteDensidade!);
    expect(r.melhorIEP!.acimaDensidade).toBe(false);
  });

  it("plans crates, trucks and feed withdrawal", () => {
    const inicio = new Date(2026, 10, 30, 22, 0);
    const c = planejarCarregamento({
      inicioApanha: inicio,
      aves: 19000,
      pesoG: 2800,
      jejumH: 10,
      transporteEsperaH: 3,
      avesPorHora: 4000,
      maxAvesCaixa: 10,
      maxKgCaixa: 22,
      caixasPorCaminhao: 320,
    });
    expect(c.avesPorCaixa).toBe(7);
    expect(c.caixas).toBe(2715);
    expect(c.caminhoes).toBe(9);
    expect(c.retiradaRacao.getTime()).toBeLessThan(inicio.getTime());
    expect(c.horasNoGalpao).toBeCloseTo(10 - 3 - 19000 / 4000 / 2);
  });

  it("flags crowded equipment and leaves unknown inputs neutral", () => {
    const r = dimensionar({
      idade: 35,
      aves: 20000,
      pesoG: 2200,
      areaM2: 1200,
      comedouros: 300,
      bebedouros: 0,
      exaustores: 0,
      cfmExaustor: 0,
    });
    expect(r.find((x) => x.item === "Aves por comedouro (prato)")?.ok).toBe(false);
    expect(r.find((x) => x.item === "Aves por nipple")?.ok).toBeNull();
  });
});
