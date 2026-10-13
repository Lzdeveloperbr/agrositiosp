import { describe, expect, it } from "vitest";
import { ROSS_AP95_WEIGHTS, ROSS_AP95_FEED, ROSS_AP95_PHOTO_TARGETS } from "./ross-ap95";
import { CURVAS, metaPeso, resolveLinhagem } from "./linhagens";

describe("Ross AP95 official as-hatched objectives", () => {
  it("covers D0-D56 and keeps integrator targets distinct", () => {
    expect(ROSS_AP95_WEIGHTS).toHaveLength(57);
    expect(ROSS_AP95_FEED).toHaveLength(57);
    expect(metaPeso("ross_ap95", 0)).toBe(44);
    expect(metaPeso("ross_ap95", 7)).toBe(214);
    expect(metaPeso("ross_ap95", 42)).toBe(3086);
    expect(ROSS_AP95_PHOTO_TARGETS[42]).toBe(3205);
    expect(CURVAS.ross_ap95[42].consumoAcum).toBe(4674);
  });
  it("has increasing daily weights and feed with a safe AP95 default", () => {
    for (let day = 1; day <= 56; day++) {
      expect(ROSS_AP95_WEIGHTS[day]).toBeGreaterThan(ROSS_AP95_WEIGHTS[day - 1]);
      expect(ROSS_AP95_FEED[day]).toBeGreaterThan(ROSS_AP95_FEED[day - 1]);
    }
    expect(resolveLinhagem()).toBe("ross_ap95");
    expect(resolveLinhagem("ross_ap95")).toBe("ross_ap95");
  });
});