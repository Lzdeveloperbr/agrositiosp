import { diffDias } from "@/lib/data";
import type { DailyEntry } from "@/lib/types";

export function lastWeighing(entries: DailyEntry[], today: string) {
  return (
    entries
      .filter((e) => e.date <= today && Number(e.pesoMedioG) > 0)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  );
}
export function waterFeedRatio(water: number | null, feed: number | null) {
  return water !== null &&
    feed !== null &&
    Number.isFinite(water) &&
    Number.isFinite(feed) &&
    water >= 0 &&
    feed > 0
    ? water / feed
    : null;
}
export function missingDailyEntry(entries: DailyEntry[], alojamento: string, today: string) {
  return diffDias(alojamento, today) > 0 && !entries.some((e) => e.date === today);
}
