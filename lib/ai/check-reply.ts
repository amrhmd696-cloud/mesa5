import type { RestaurantProfile } from "@/lib/ai/prompts";

// Revisión en código de cada respuesta de la IA, como segunda barrera tras el
// prompt: longitud razonable, nada de huecos sin rellenar y ninguna promesa
// (descuentos, invitaciones, reembolsos…) que no esté en la ficha del restaurante.

export interface ReplyCheck {
  ok: boolean;
  issues: string[];
}

// Palabras que suelen indicar una promesa o compensación, en los idiomas más habituales.
const PROMISE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\d+\s?%/, label: "un porcentaje" },
  { re: /\bdescuentos?\b|\bdescontar/i, label: "un descuento" },
  { re: /\bgratis\b|\bgratuit[oa]s?\b|\bsin coste\b|\bcortesía de la casa\b|\binvita la casa\b/i, label: "algo gratis" },
  // "Te invitamos a escribirnos" está bien; "te invitamos a un café", no.
  {
    re: /\binvit\w*\s+(a|al)\s+(un|una|unos|unas|el|la|tu|su)?\s*(café|postre|copa|chupito|cena|comida|bebida|ronda|plato|menú|vino)/i,
    label: "una invitación",
  },
  { re: /\bregal(o|os|amos|aremos|arte|arle)\b/i, label: "un regalo" },
  { re: /\breembols\w*|\bdevolv(emos|eremos|erte|erle)\b|\bcompensa(r|ción|remos|mos)\b/i, label: "un reembolso o compensación" },
  { re: /\bcup[oó]n(es)?\b|\bvale descuento\b|\bvale regalo\b/i, label: "un cupón" },
  { re: /\bdiscounts?\b|\brefunds?\b|\bvouchers?\b|\bcoupons?\b|\bcompensat\w*|\bon the house\b|\bcomplimentary\b/i, label: "un descuento o compensación" },
  { re: /\b(for|totally|completely)\s+free\b|\bfree\s+(of charge|meal|dessert|drinks?|dinner|lunch|coffee|bottle)\b/i, label: "algo gratis" },
  { re: /\bréduction\b|\bremise\b|\bgratuit\w*|\boffert\w*|\bremboursement\b/i, label: "un descuento o regalo" },
  { re: /\brabatt\b|\bkostenlos\b|\bgutschein\b|\bgratis\b|\berstatt\w*/i, label: "un descuento o regalo" },
  { re: /\bsconto\b|\bomaggio\b|\brimborso\b/i, label: "un descuento o regalo" },
];

const PLACEHOLDER = /\[[^\]]*\]|\{[^}]*\}|<[^>]*>|\bXXX\b|\bTODO\b|\bNOMBRE\b/;
const URL_OR_EMAIL = /https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.]+/gi;
const PHONE = /(?:\+?\d[\s.-]?){7,}/g;

function digits(s: string) {
  return s.replace(/\D/g, "");
}

export function countSentences(text: string): number {
  return text
    .split(/(?<=[.!?¡¿…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
}

export function checkReply(reply: string, profile: RestaurantProfile): ReplyCheck {
  const issues: string[] = [];
  const text = reply.trim();
  const profileText = [
    profile.name,
    profile.signature ?? "",
    ...profile.starDishes,
    ...Object.values(profile.usefulInfo),
  ]
    .join(" \n ")
    .toLowerCase();

  if (text.length < 30) issues.push("La respuesta es demasiado corta.");
  if (text.length > 1200) issues.push("La respuesta es demasiado larga (más de 1.200 caracteres).");

  // Sin contar la firma, entre 2 y 6 frases (damos una de margen sobre las 5 del prompt).
  const body = profile.signature ? text.replace(profile.signature, "") : text;
  const sentences = countSentences(body);
  if (sentences < 2) issues.push("La respuesta debe tener al menos 2 frases.");
  if (sentences > 6) issues.push("La respuesta tiene más de 5 frases.");

  if (PLACEHOLDER.test(text)) issues.push("La respuesta tiene un hueco sin rellenar (corchetes, llaves o similar).");

  for (const { re, label } of PROMISE_PATTERNS) {
    const match = text.match(re);
    if (match && !profileText.includes(match[0].toLowerCase())) {
      issues.push(`Promete ${label} ("${match[0]}") que no está en la ficha del restaurante.`);
      break;
    }
  }

  for (const m of text.match(URL_OR_EMAIL) ?? []) {
    if (!profileText.includes(m.toLowerCase())) issues.push(`Incluye un enlace o email inventado (${m}).`);
  }
  const profileDigits = digits(profileText);
  for (const m of text.match(PHONE) ?? []) {
    const d = digits(m);
    if (d.length >= 7 && !profileDigits.includes(d)) issues.push(`Incluye un teléfono que no está en la ficha (${m.trim()}).`);
  }

  return { ok: issues.length === 0, issues };
}

/** Si la IA olvidó la firma, la añadimos al final en su propia línea. */
export function ensureSignature(reply: string, signature: string | null): string {
  const text = reply.trim();
  if (!signature) return text;
  if (text.toLowerCase().includes(signature.trim().toLowerCase())) return text;
  return `${text}\n${signature.trim()}`;
}
