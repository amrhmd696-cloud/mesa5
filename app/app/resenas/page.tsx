import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge, TopicChips } from "@/components/reviews/badges";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Stars } from "@/components/ui/Stars";
import { STATUS_LABELS, TOPIC_LABELS } from "@/lib/ai/labels";
import { TOPICS, type Topic } from "@/lib/ai/schema";
import { getWorkspace, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reseñas" };

const STATUS_FILTERS = { pendientes: "pending", respondidas: "answered" } as const;
type StatusFilter = keyof typeof STATUS_FILTERS;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Historial de reseñas con sus estados y temas. Filtros por la URL
// (?estado=pendientes&tema=espera) para poder compartir o volver atrás.
export default async function ReviewsPage({ searchParams }: PageProps<"/app/resenas">) {
  await requireUser("/app/resenas");
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const params = await searchParams;
  const estado = one(params.estado);
  const tema = one(params.tema);
  const status = estado && estado in STATUS_FILTERS ? STATUS_FILTERS[estado as StatusFilter] : null;
  const topic = tema && (TOPICS as readonly string[]).includes(tema) ? (tema as Topic) : null;

  const supabase = await createClient();
  let query = supabase
    .from("reviews")
    // Con filtro de tema, un segundo embed (!inner) filtra sin recortar los temas que se muestran.
    .select(
      topic
        ? "id, author_name, rating, text, status, created_at, review_topics(topic, polarity), by_topic:review_topics!inner(topic)"
        : "id, author_name, rating, text, status, created_at, review_topics(topic, polarity)",
    )
    .eq("restaurant_id", ws.restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  if (topic) query = query.eq("by_topic.topic", topic);
  const { data, error } = await query;
  if (error) console.error("[reseñas] lista", error.message);

  type Row = {
    id: string;
    author_name: string | null;
    rating: number;
    text: string;
    status: "pending" | "answered";
    created_at: string;
    review_topics: { topic: Topic; polarity: "positivo" | "negativo" }[];
  };
  const reviews = (data ?? []) as unknown as Row[];
  const filtered = Boolean(status || topic);

  function href(next: { estado?: string | null; tema?: string | null }) {
    const e = next.estado === undefined ? estado : next.estado;
    const t = next.tema === undefined ? tema : next.tema;
    const qs = new URLSearchParams();
    if (e && e in STATUS_FILTERS) qs.set("estado", e);
    if (t && (TOPICS as readonly string[]).includes(t)) qs.set("tema", t);
    const s = qs.toString();
    return s ? `/app/resenas?${s}` : "/app/resenas";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Reseñas</h1>
        <ButtonLink href="/app/resenas/nueva">Responder una reseña</ButtonLink>
      </div>

      <nav aria-label="Filtros" className="space-y-2">
        <FilterRow
          label="Estado"
          options={[
            { label: "Todas", href: href({ estado: null }), active: !status },
            ...(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => ({
              label: STATUS_LABELS[STATUS_FILTERS[key]] + "s",
              href: href({ estado: key }),
              active: estado === key,
            })),
          ]}
        />
        <FilterRow
          label="Tema"
          options={[
            { label: "Todos", href: href({ tema: null }), active: !topic },
            ...TOPICS.map((t) => ({ label: TOPIC_LABELS[t], href: href({ tema: t }), active: topic === t })),
          ]}
        />
      </nav>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          {filtered ? (
            <p className="text-ink-soft">No hay reseñas con estos filtros.</p>
          ) : (
            <>
              <p className="font-semibold">Aún no has respondido ninguna reseña.</p>
              <p className="mt-1 text-sm text-ink-soft">
                Copia una reseña de Google, pégala aquí y en segundos tendrás dos respuestas con el tono de tu restaurante.
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/resenas/${r.id}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={r.rating} />
                  <span className="font-semibold">{r.author_name ?? "Cliente"}</span>
                  <StatusBadge status={r.status} />
                  <time dateTime={r.created_at} className="ml-auto text-xs text-ink-soft">
                    {new Date(r.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}
                  </time>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{r.text}</p>
                <div className="mt-2">
                  <TopicChips topics={r.review_topics} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterRow({ label, options }: { label: string; options: { label: string; href: string; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 text-sm font-semibold text-ink-soft">{label}</span>
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm ${
            o.active ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface hover:border-brand"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
