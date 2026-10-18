import { afterEach, describe, expect, it, vi } from "vitest";

describe("planes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("usa los precios por defecto si no hay variables", async () => {
    const { plans } = await import("@/lib/billing/plans");
    expect(plans.basic.priceEur).toBe(19);
    expect(plans.pro.priceEur).toBe(39);
    expect(plans.multi.priceEur).toBe(79);
  });

  it("lee los precios desde las variables de entorno", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRICE_PRO_EUR", "45");
    const { plans } = await import("@/lib/billing/plans");
    expect(plans.pro.priceEur).toBe(45);
  });

  it("ignora precios no válidos", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRICE_BASIC_EUR", "gratis");
    const { plans } = await import("@/lib/billing/plans");
    expect(plans.basic.priceEur).toBe(19);
  });

  it("respeta los límites de cada plan", async () => {
    const { plans } = await import("@/lib/billing/plans");
    expect(plans.basic.monthlyReplies).toBe(60);
    expect(plans.pro.monthlyReplies).toBeNull();
    expect(plans.multi.maxLocations).toBe(5);
    expect(plans.basic.monthlyReport).toBe(false);
    expect(plans.pro.alerts).toBe(true);
  });

  it("formatea euros en español", async () => {
    const { formatEur } = await import("@/lib/billing/plans");
    expect(formatEur(19).replace(/\s/g, " ")).toBe("19 €");
  });
});
