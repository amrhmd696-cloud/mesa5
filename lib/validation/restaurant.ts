import { z } from "zod";

// Validación de los datos del restaurante (onboarding y ajustes).

export const TONES = ["cercano", "formal", "divertido"] as const;
export type Tone = (typeof TONES)[number];

// Dominios aceptados para el enlace de Google (ficha, Maps o "pedir reseñas")
const GOOGLE_HOSTS = [/(^|\.)google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/, /^g\.page$/, /^maps\.app\.goo\.gl$/, /^goo\.gl$/, /^g\.co$/];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

export const googleUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .refine((v) => {
    if (v === null) return true;
    try {
      const url = new URL(v);
      return url.protocol === "https:" && GOOGLE_HOSTS.some((re) => re.test(url.hostname));
    } catch {
      return false;
    }
  }, "Pega un enlace de Google que empiece por https:// (por ejemplo, el de «Pedir reseñas»)");

/** Lista separada por comas → array limpio de hasta 5 platos */
const dishes = z
  .string()
  .max(400)
  .transform((v) =>
    v
      .split(/[,\n]/)
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((d) => d.slice(0, 60)),
  );

export const restaurantSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del restaurante").max(120),
  cuisine: optionalText(60),
  city: optionalText(80),
  googleUrl,
  tone: z.enum(TONES, { message: "Elige un tono" }),
  signature: optionalText(120),
  starDishes: dishes,
  hours: optionalText(200),
  bookings: optionalText(200),
  whatsapp: optionalText(30),
});

export type RestaurantInput = z.infer<typeof restaurantSchema>;

/** Datos útiles que se guardan en la columna useful_info (solo los que tienen valor). */
export function usefulInfo(input: RestaurantInput) {
  const info: Record<string, string> = {};
  if (input.hours) info.horario = input.hours;
  if (input.bookings) info.reservas = input.bookings;
  if (input.whatsapp) info.whatsapp = input.whatsapp;
  return info;
}
