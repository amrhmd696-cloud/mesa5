import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteReviewAction } from "@/app/app/resenas/actions";
import { StatusBadge, TopicChips } from "@/components/reviews/badges";
import { ReplyCard, type ReplyView } from "@/components/reviews/ReplyCard";
import { Stars } from "@/components/ui/Stars";
import type { Topic } from "@/lib/ai/schema";
import { getWorkspace, requireUser } from "@/lib/auth";
import { QUOTA_MESSAGES, getQuotaStatus } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reseña" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewPage({ params }: PageProps<"/app/resenas/[id]">) {
  const { id } = await params;
  await requireUser(`/app/resenas/${encodeURIComponent(id)}`);
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  // RLS: solo aparece si la reseña es de un restaurante nuestro.
  const [{ data: review }, { data: restaurant }, status] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, author_name, rating, text, status, sentiment, created_at, review_topics(topic, polarity), replies(id, version, text, adjustment, is_selected)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("restaurants").select("google_url").eq("id", ws.restaurant.id).single(),
    getQuotaStatus(ws.org.id),
  ]);
  if (!review) notFound();

  type Reply = { id: string; version: number; text: string; adjustment: ReplyView["adjustment"]; is_selected: boolean };
  const replies = ((review.replies ?? []) as Reply[])
    .sort((a, b) => a.version - b.version)
    .map((r): ReplyView => ({ id: r.id, version: r.version, text: r.text, adjustment: r.adjustment, isSelected: r.is_selected }));
  const topics = (review.review_topics ?? []) as { topic: Topic; polarity: "positivo" | "negativo" }[];
  // Ajustar no gasta cuota: solo se bloquea si la prueba acabó o el pago está pendiente.
  const canUseAi = status !== "trial_expired" && status !== "inactive";

  return (
    <div className="space-y-6">
      <Link href="/app/resenas" className="text-sm font-medium text-ink-soft hover:text-brand">
        ← Reseñas
      </Link>

      <section className="rounded-2xl border border-line bg-sand/40 p-4 sm:p-5" aria-label="Reseña del cliente">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={review.rating} />
          <span className="font-semibold">{review.author_name ?? "Cliente"}</span>
          <StatusBadge status={review.status} />
        </div>
        <p className="mt-3 whitespace-pre-line">{review.text}</p>
        <div className="mt-3">
          <TopicChips topics={topics} />
        </div>
      </section>

      <div>
        <h1 className="font-display text-2xl font-bold">Tus respuestas</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Elige una, cópiala y pégala en Google como respuesta a la reseña. Luego márcala como publicada.
        </p>
        {restaurant?.google_url && (
          <a
            href={restaurant.google_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-brand underline underline-offset-4"
          >
            Abrir tu ficha de Google
          </a>
        )}
      </div>

      {!canUseAi && (
        <p role="status" className="rounded-xl bg-wine/10 p-3 text-sm text-wine">
          {QUOTA_MESSAGES[status]}
        </p>
      )}

      <div className="space-y-4">
        {replies.map((reply) => (
          <ReplyCard key={reply.id} reply={reply} canUseAi={canUseAi} />
        ))}
      </div>

      <details className="border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-wine">Borrar esta reseña del historial</summary>
        <form action={deleteReviewAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="reviewId" value={review.id} />
          <p className="text-sm text-ink-soft">Se borrarán también sus respuestas.</p>
          <button type="submit" className="min-h-10 rounded-full bg-wine px-4 text-sm font-semibold text-cream">
            Sí, borrar
          </button>
        </form>
      </details>
    </div>
  );
}
