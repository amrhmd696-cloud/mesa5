import { describe, expect, it } from "vitest";
import { trialDaysLeft } from "@/lib/billing/trial";

describe("días de prueba", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  it("cuenta los días que faltan redondeando hacia arriba", () => {
    expect(trialDaysLeft("2026-11-01T12:00:00Z", now)).toBe(14);
    expect(trialDaysLeft("2026-10-18T13:00:00Z", now)).toBe(1);
  });
  it("nunca es negativo", () => {
    expect(trialDaysLeft("2026-10-01T00:00:00Z", now)).toBe(0);
  });
});
