import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RestaurantForm } from "@/components/app/RestaurantForm";
import { getWorkspace, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const user = await requireUser("/app/ajustes");
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const supabase = await createClient();
  const { data: r } = await supabase
    .from("restaurants")
    .select("name, cuisine, city, google_url, tone, signature, star_dishes, useful_info")
    .eq("id", ws.restaurant.id)
    .single();
  const info = (r?.useful_info ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Ajustes del restaurante</h1>
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <RestaurantForm
          mode="settings"
          ownerName={user.fullName}
          defaults={{
            name: r?.name,
            cuisine: r?.cuisine,
            city: r?.city,
            googleUrl: r?.google_url,
            tone: r?.tone,
            signature: r?.signature,
            starDishes: r?.star_dishes,
            hours: info.horario,
            bookings: info.reservas,
            whatsapp: info.whatsapp,
          }}
        />
      </div>
    </div>
  );
}
