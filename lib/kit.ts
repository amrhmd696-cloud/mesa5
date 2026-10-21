import { cacheLife, cacheTag } from "next/cache";
import { absoluteUrl } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// Kit de reseñas: datos públicos del restaurante, su enlace y los textos
// para WhatsApp. Lo usan la página pública /r/<slug> y la página Kit del panel.

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  logoUrl: string | null;
  googleUrl: string | null;
}

export const restaurantTag = (slug: string) => `restaurante-${slug}`;

/** Enlace que va en el QR y en WhatsApp. Siempre el dominio público (se imprime). */
export function reviewPageUrl(slug: string, source?: "qr" | "ticket" | "whatsapp"): string {
  return absoluteUrl(`/r/${slug}${source ? `?origen=${source}` : ""}`);
}

export async function getPublicRestaurant(slug: string): Promise<PublicRestaurant | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(restaurantTag(slug));
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || !isSupabaseConfigured()) return null;
  const { data, error } = await createPublicClient().rpc("public_restaurant", { p_slug: slug }).maybeSingle();
  if (error) throw new Error(`public_restaurant: ${error.message}`);
  if (!data) return null;
  const row = data as { id: string; name: string; slug: string; city: string | null; logo_url: string | null; google_url: string | null };
  return { id: row.id, name: row.name, slug: row.slug, city: row.city, logoUrl: row.logo_url, googleUrl: row.google_url };
}

/** Mensajes listos para mandar por WhatsApp después de la visita. */
export function whatsappTemplates(name: string, link: string): { title: string; text: string }[] {
  return [
    {
      title: "Cercano",
      text: `¡Hola! Gracias por venir a ${name} 😊 Si te gustó, ¿nos dejarías una reseña en Google? Nos ayuda muchísimo a que nos conozcan: ${link}`,
    },
    {
      title: "Formal",
      text: `Buenas, le escribimos de ${name}. Gracias por su visita. Si tiene un minuto, nos ayudaría mucho su opinión en Google: ${link}`,
    },
    {
      title: "Muy corto",
      text: `¡Gracias por venir a ${name}! ¿Nos dejas tu opinión en Google? ${link}`,
    },
  ];
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
