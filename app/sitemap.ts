import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

// Sitemap para Google. Se amplía solo al añadir artículos en lib/blog.ts.
// Las páginas públicas de cada restaurante (/r/...) se añadirán en la fase 1D.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/legal/terminos"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/legal/privacidad"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/legal/cookies"), changeFrequency: "yearly", priority: 0.2 },
  ];
  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.date,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticPages, ...blogPages];
}
