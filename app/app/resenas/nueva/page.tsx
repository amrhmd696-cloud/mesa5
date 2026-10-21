import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewReviewForm } from "@/components/reviews/NewReviewForm";
import { getWorkspace, requireUser } from "@/lib/auth";
import { QUOTA_MESSAGES, getMonthlyUsage, getQuotaStatus } from "@/lib/reviews";

export const metadata: Metadata = { title: "Responder una reseña" };

export default async function NewReviewPage() {
  await requireUser("/app/resenas/nueva");
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const [status, usage] = await Promise.all([getQuotaStatus(ws.org.id), getMonthlyUsage(ws)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/resenas" className="text-sm font-medium text-ink-soft hover:text-brand">
          ← Reseñas
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Responder una reseña</h1>
        <p className="mt-1 text-ink-soft">
          Copia la reseña de Google y pégala aquí. Te daremos dos respuestas con el tono de {ws.restaurant.name}.
        </p>
      </div>

      {status !== "ok" ? (
        <div role="alert" className="rounded-2xl border border-wine/30 bg-wine/5 p-5">
          <p className="font-semibold text-wine">{QUOTA_MESSAGES[status]}</p>
          <Link href="/app/plan" className="mt-3 inline-block font-semibold text-brand underline underline-offset-4">
            Ver planes
          </Link>
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <NewReviewForm />
          {usage.limit !== null && (
            <p className="mt-4 text-center text-sm text-ink-soft">
              Te quedan {Math.max(0, usage.limit - usage.used)} de {usage.limit} respuestas este mes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
