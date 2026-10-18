import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspace, requireUser } from "@/lib/auth";
import { trialDaysLeft as daysLeft } from "@/lib/billing/trial";
import { createClient } from "@/lib/supabase/server";

// Panel principal. En la fase 1E se llenará de estadísticas; por ahora da la
// bienvenida y muestra los próximos pasos.
export default async function AppHomePage() {
  await requireUser();
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const supabase = await createClient();
  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", ws.restaurant.id);
  const hasReviews = (count ?? 0) > 0;
  const trialDaysLeft = daysLeft(ws.org.trialEndsAt);
  const firstName = ws.user.fullName?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">¡Hola{firstName ? `, ${firstName}` : ""}!</h1>
        <p className="mt-1 text-ink-soft">{ws.restaurant.name} ya está en Mesa5.</p>
      </div>

      {ws.org.plan === "trial" && (
        <div className="rounded-2xl border border-star/60 bg-star/10 p-4">
          <p className="font-semibold">
            Te quedan {trialDaysLeft} {trialDaysLeft === 1 ? "día" : "días"} de prueba gratuita
          </p>
          <p className="mt-1 text-sm text-ink-soft">Tienes todas las funciones de Pro. No necesitas tarjeta.</p>
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-bold">Próximos pasos</h2>
        <ol className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive text-sm font-bold text-cream">✓</span>
            <span>Perfil del restaurante creado</span>
          </li>
          <li className="flex gap-3">
            {hasReviews ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive text-sm font-bold text-cream">✓</span>
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">2</span>
            )}
            <Link href={hasReviews ? "/app/resenas" : "/app/resenas/nueva"} className="font-semibold text-brand underline underline-offset-4">
              {hasReviews ? "Ver tus reseñas respondidas" : "Responder tu primera reseña con IA"}
            </Link>
          </li>
          <li className="flex gap-3 text-ink-soft">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-sm font-bold">3</span>
            <span>Descargar tu QR para las mesas <em className="text-xs">(muy pronto)</em></span>
          </li>
        </ol>
      </section>

      <Link href="/app/ajustes" className="inline-block font-semibold text-brand underline underline-offset-4">
        Editar los datos del restaurante
      </Link>
    </div>
  );
}
