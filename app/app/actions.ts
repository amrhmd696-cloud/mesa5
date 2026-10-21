"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspace, requireUser } from "@/lib/auth";
import { restaurantTag } from "@/lib/kit";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { restaurantSchema, usefulInfo } from "@/lib/validation/restaurant";

export type RestaurantFormState = { error?: string; ok?: string } | undefined;

function parse(formData: FormData) {
  return restaurantSchema.safeParse({
    name: formData.get("name") ?? "",
    cuisine: formData.get("cuisine") ?? "",
    city: formData.get("city") ?? "",
    googleUrl: formData.get("googleUrl") ?? "",
    tone: formData.get("tone") ?? "",
    signature: formData.get("signature") ?? "",
    starDishes: formData.get("starDishes") ?? "",
    hours: formData.get("hours") ?? "",
    bookings: formData.get("bookings") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
  });
}

/** Onboarding: crea la organización, el dueño y el primer restaurante. */
export async function completeOnboarding(_: RestaurantFormState, formData: FormData): Promise<RestaurantFormState> {
  await requireUser("/app/onboarding");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const r = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_restaurant_with_org", {
    p_name: r.name,
    p_slug: slugify(r.name),
    p_cuisine: r.cuisine,
    p_city: r.city,
    p_google_url: r.googleUrl,
    p_tone: r.tone,
    p_signature: r.signature,
    p_star_dishes: r.starDishes,
    p_useful_info: usefulInfo(r),
  });

  if (error && !error.message.includes("already_onboarded")) {
    console.error("[onboarding]", error.message);
    return { error: "No hemos podido guardar tu restaurante. Inténtalo de nuevo." };
  }
  redirect("/app?bienvenida=1");
}

/** Ajustes: actualiza los datos del restaurante actual. */
export async function updateRestaurant(_: RestaurantFormState, formData: FormData): Promise<RestaurantFormState> {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/app/onboarding");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const r = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name: r.name,
      cuisine: r.cuisine,
      city: r.city,
      google_url: r.googleUrl,
      tone: r.tone,
      signature: r.signature,
      star_dishes: r.starDishes,
      useful_info: usefulInfo(r),
    })
    .eq("id", workspace.restaurant.id);

  if (error) {
    console.error("[ajustes]", error.message);
    return { error: "No hemos podido guardar los cambios. Inténtalo de nuevo." };
  }
  // La página pública /r/<slug> está en caché: que se vea el cambio al momento.
  updateTag(restaurantTag(workspace.restaurant.slug));
  return { ok: "Cambios guardados." };
}
