// Registro de artículos del blog.
// Para publicar uno nuevo:
// 1) crea content/blog/<slug>.mdx con el texto,
// 2) añade aquí su ficha (slug, título, descripción y fecha).
// El sitemap y la página /blog se actualizan solos.

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** Fecha de publicación en formato AAAA-MM-DD */
  date: string;
  readingMinutes: number;
}

export const posts: BlogPost[] = [
  {
    slug: "como-responder-una-resena-negativa-restaurante",
    title: "Cómo responder una reseña negativa en un restaurante (con ejemplos)",
    description:
      "Guía práctica para responder críticas en Google sin perder clientes: estructura, errores que evitar y 4 ejemplos listos para adaptar.",
    date: "2026-10-18",
    readingMinutes: 6,
  },
  {
    slug: "como-conseguir-mas-resenas-google-restaurante",
    title: "7 formas de conseguir más reseñas en Google para tu restaurante",
    description:
      "Ideas sencillas y permitidas por Google para que tus clientes contentos dejen su opinión: QR, tickets, WhatsApp y más.",
    date: "2026-10-18",
    readingMinutes: 5,
  },
];

export function getSortedPosts(): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
