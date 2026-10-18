import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { restaurantSchema, usefulInfo } from "@/lib/validation/restaurant";

const base = {
  name: "La Parrilla",
  cuisine: "",
  city: "Sevilla",
  googleUrl: "",
  tone: "cercano",
  signature: "",
  starDishes: "",
  hours: "",
  bookings: "",
  whatsapp: "",
};

describe("slugify", () => {
  it.each([
    ["La Parrilla", "la-parrilla"],
    ["Café Lúa & Co.", "cafe-lua-y-co"],
    ["  Señor Ñandú  ", "senor-nandu"],
    ["Pizzería 'Nonna' 2", "pizzeria-nonna-2"],
    ["!", "restaurante-mesa5"],
  ])("%s → %s", (input, out) => expect(slugify(input)).toBe(out));

  it("cumple el formato que exige la base de datos", () => {
    const re = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const s of ["El Rincón de Pepe — Tapas", "A".repeat(200), "x"]) {
      const slug = slugify(s);
      expect(slug).toMatch(re);
      expect(slug.length).toBeLessThanOrEqual(80);
    }
  });
});

describe("datos del restaurante", () => {
  it("convierte los campos vacíos en null", () => {
    const r = restaurantSchema.parse(base);
    expect(r.cuisine).toBeNull();
    expect(r.googleUrl).toBeNull();
    expect(r.starDishes).toEqual([]);
    expect(usefulInfo(r)).toEqual({});
  });

  it("separa los platos estrella por comas y limita a 5", () => {
    const r = restaurantSchema.parse({ ...base, starDishes: "Chuletón, Pimientos,, Tarta de queso, a, b, c" });
    expect(r.starDishes).toEqual(["Chuletón", "Pimientos", "Tarta de queso", "a", "b"]);
  });

  it.each([
    "https://g.page/r/CabcDEF/review",
    "https://maps.app.goo.gl/AbC123",
    "https://www.google.com/maps/place/La+Parrilla",
    "https://www.google.es/search?q=la+parrilla",
    "https://search.google.com/local/writereview?placeid=ChIJ",
  ])("acepta el enlace de Google %s", (url) => {
    expect(restaurantSchema.safeParse({ ...base, googleUrl: url }).success).toBe(true);
  });

  it.each(["http://g.page/r/abc", "https://evil.com/google.com", "https://google.com.evil.com", "javascript:alert(1)", "no es un enlace"])(
    "rechaza %s",
    (url) => {
      expect(restaurantSchema.safeParse({ ...base, googleUrl: url }).success).toBe(false);
    },
  );

  it("exige nombre y un tono válido", () => {
    expect(restaurantSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(restaurantSchema.safeParse({ ...base, tone: "agresivo" }).success).toBe(false);
  });

  it("guarda solo los datos útiles rellenados", () => {
    const r = restaurantSchema.parse({ ...base, hours: "13:00-16:00", whatsapp: "+34 600 000 000" });
    expect(usefulInfo(r)).toEqual({ horario: "13:00-16:00", whatsapp: "+34 600 000 000" });
  });
});
