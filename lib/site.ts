// Datos generales del sitio. La URL pública sale de una variable de entorno
// para que funcione igual en local, en las previews de Vercel y en producción.
// Si falta NEXT_PUBLIC_SITE_URL, en Vercel se usa el dominio de producción
// (variable de sistema VERCEL_PROJECT_PRODUCTION_URL, sin https://).
function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Mesa5",
  tagline: "Más reseñas, mejores respuestas, más clientes",
  url: siteUrl().replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hola@mesa5.app",
  trialDays: 14,
};

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
