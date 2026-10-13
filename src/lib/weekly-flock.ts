import { addDias, diffDias, isoLocal } from "./data";
import type { Lote } from "./types";

/** Seven calendar dates per week. D0 is included in week 1 (D0-D6). */
export function weeklyFlock(lote: Lote, today = isoLocal()) {
  const count = Math.max(8, Math.ceil((diffDias(lote.dataEntrada, today) + 1) / 7));
  let cumulativeDeaths = 0, cumulativeCulls = 0;
  const pct = (n: number) => lote.quantidadeInicial > 0 ? n / lote.quantidadeInicial * 100 : 0;
  const safe = (n: unknown) => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
  return Array.from({ length: count }, (_, index) => {
    const startAge = index * 7;
    const openingBirds = Math.max(0, lote.quantidadeInicial - cumulativeDeaths - cumulativeCulls);
    const days = Array.from({ length: 7 }, (_, i) => {
      const age = startAge + i, date = addDias(lote.dataEntrada, age);
      const entries = date <= today ? lote.entries.filter((e) => e.date === date) : [];
      return { age, date, recorded: entries.length > 0, future: date > today,
        deaths: entries.reduce((s, e) => s + safe(e.mortalidade), 0),
        culls: entries.reduce((s, e) => s + safe(e.eliminados), 0) };
    });
    const deaths = days.reduce((s, d) => s + d.deaths, 0);
    const culls = days.reduce((s, d) => s + d.culls, 0);
    cumulativeDeaths += deaths; cumulativeCulls += culls;
    const losses = deaths + culls, cumulativeLosses = cumulativeDeaths + cumulativeCulls;
    const missing = days.filter((d) => !d.future && !d.recorded).length;
    return { week: index + 1, startAge, endAge: startAge + 6, days, deaths, culls, losses,
      deathsPct: pct(deaths), cullsPct: pct(culls), lossesPct: pct(losses),
      cumulativeDeaths, cumulativeCulls, cumulativeLosses, cumulativePct: pct(cumulativeLosses),
      openingBirds, liveBirds: Math.max(0, lote.quantidadeInicial - cumulativeLosses), missing,
      status: days.every((d) => d.future) ? "Não iniciada" : days.some((d) => d.future) ? "Em andamento" : missing ? "Incompleta" : "Fechada" };
  });
}