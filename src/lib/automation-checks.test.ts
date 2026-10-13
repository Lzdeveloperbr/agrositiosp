import { describe, expect, it } from "vitest";
import { lastWeighing, waterFeedRatio, missingDailyEntry } from "./automation-checks";

describe("poultry automation checks", () => {
  it("selects the most recent past measurement, not array order or future dates", () => {
    const entries = [
      { date: "2026-10-01", pesoMedioG: 400, mortalidade: 0 },
      { date: "2026-10-20", pesoMedioG: 900, mortalidade: 0 },
      { date: "2026-10-05", pesoMedioG: 600, mortalidade: 0 },
    ];
    expect(lastWeighing(entries, "2026-10-12")?.pesoMedioG).toBe(600);
    expect(lastWeighing([], "2026-10-12")).toBeNull();
  });
  it("distinguishes unavailable consumption from measured zero", () => {
    expect(waterFeedRatio(null, 20)).toBeNull();
    expect(waterFeedRatio(20, 0)).toBeNull();
    expect(waterFeedRatio(0, 20)).toBe(0);
    expect(waterFeedRatio(40, 20)).toBe(2);
  });
  it("does not mistake a zero-loss daily entry for a missing entry", () => {
    expect(missingDailyEntry([], "2026-10-01", "2026-10-12")).toBe(true);
    expect(
      missingDailyEntry([{ date: "2026-10-12", mortalidade: 0 }], "2026-10-01", "2026-10-12"),
    ).toBe(false);
    expect(missingDailyEntry([], "2026-10-12", "2026-10-12")).toBe(false);
  });
});
