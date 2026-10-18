// Datos generales del sitio. La URL pública sale de una variable de entorno
// para que funcione igual en local, en las previews de Vercel y en producción.
export const siteConfig = {
  name: "Mesa5",
  tagline: "Más reseñas, mejores respuestas, más clientes",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hola@mesa5.app",
  trialDays: 14,
};

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
