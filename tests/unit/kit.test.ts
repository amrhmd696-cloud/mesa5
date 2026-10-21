import { describe, expect, it } from "vitest";
import { reviewPageUrl, whatsappShareUrl, whatsappTemplates } from "@/lib/kit";

describe("kit de reseñas", () => {
  it("el enlace de la página pública lleva el origen para saber de dónde vienen", () => {
    expect(reviewPageUrl("casa-pepe")).toMatch(/\/r\/casa-pepe$/);
    expect(reviewPageUrl("casa-pepe", "qr")).toMatch(/\/r\/casa-pepe\?origen=qr$/);
  });

  it("las plantillas de WhatsApp llevan el nombre y el enlace", () => {
    const link = "https://mesa5.app/r/casa-pepe?origen=whatsapp";
    const templates = whatsappTemplates("Casa Pepe", link);
    expect(templates.length).toBeGreaterThanOrEqual(3);
    for (const t of templates) {
      expect(t.text).toContain("Casa Pepe");
      expect(t.text).toContain(link);
      // Sin "review gating": no se pide la reseña solo a quien le gustó.
      expect(t.text.toLowerCase()).not.toMatch(/si (no )?te (ha )?gustado.*(escr[ií]benos|cu[eé]ntanos)/);
    }
  });

  it("el enlace de WhatsApp codifica el texto", () => {
    expect(whatsappShareUrl("¡Hola & gracias!")).toBe("https://wa.me/?text=%C2%A1Hola%20%26%20gracias!");
  });
});
