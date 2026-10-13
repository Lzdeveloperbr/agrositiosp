import { describe, expect, it } from "vitest";
import { weeklyFlock } from "./weekly-flock";
import type { Lote } from "./types";
const lot: Lote = { id: "test", numero: "001", dataEntrada: "2026-10-01", quantidadeInicial: 1000,
  integradora: "", percentualLucro: 14, previsaoAbateDias: 42, entries: [
    { date: "2026-10-01", mortalidade: 2, eliminados: 1 },
    { date: "2026-10-07", mortalidade: 3, eliminados: 2 },
    { date: "2026-10-08", mortalidade: 4, eliminados: 1 },
    { date: "2026-11-01", mortalidade: 100 },
  ] };
describe("weekly flock", () => {
  it("includes D0-D6 once and starts week 2 on D7", () => {
    const [a,b] = weeklyFlock(lot, "2026-10-10");
    expect(a.deaths).toBe(5); expect(a.culls).toBe(3); expect(a.lossesPct).toBe(0.8);
    expect(b.deaths).toBe(4); expect(b.cumulativeLosses).toBe(13);
    expect(b.liveBirds).toBe(987); expect(b.cumulativePct).toBe(1.3);
  });
  it("distinguishes missing records and future days from recorded zeros", () => {
    const [a,b] = weeklyFlock(lot, "2026-10-01");
    expect(a.status).toBe("Em andamento"); expect(a.missing).toBe(0);
    expect(a.days[1].future).toBe(true); expect(b.losses).toBe(0);
    expect(weeklyFlock(lot,"2026-10-10")[0].status).toBe("Incompleta");
  });
});