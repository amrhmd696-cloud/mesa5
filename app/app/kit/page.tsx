import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { markFeedbackReadAction } from "@/app/app/kit/actions";
import { CopyButton } from "@/components/kit/CopyButton";
import { getWorkspace, requireUser } from "@/lib/auth";
import { reviewPageUrl, whatsappShareUrl, whatsappTemplates } from "@/lib/kit";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kit de reseñas" };

const linkButton =
  "inline-flex min-h-10 items-center rounded-full border border-ink/20 px-4 text-sm font-semibold hover:border-brand hover:text-brand";

export default async function KitPage() {
  await requireUser("/app/kit");
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const supabase = await createClient();
  const [{ data: restaurant }, { data: feedback }] = await Promise.all([
    supabase.from("restaurants").select("google_url").eq("id", ws.restaurant.id).single(),
    supabase
      .from("private_feedback")
      .select("id, message, contact, consent, read_at, created_at")
      .eq("restaurant_id", ws.restaurant.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const pageUrl = reviewPageUrl(ws.restaurant.slug);
  const whatsappUrl = reviewPageUrl(ws.restaurant.slug, "whatsapp");
  const qrSvg = await QRCode.toString(reviewPageUrl(ws.restaurant.slug, "qr"), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2b211c", light: "#ffffff" },
  });
  const templates = whatsappTemplates(ws.restaurant.name, whatsappUrl);
  const unread = (feedback ?? []).filter((f) => !f.read_at).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Kit de reseñas</h1>
        <p className="mt-1 text-ink-soft">Todo lo que necesitas para que tus clientes te dejen reseñas en Google.</p>
      </div>

      {!restaurant?.google_url && (
        <div role="alert" className="rounded-2xl border border-star/60 bg-star/10 p-4">
          <p className="font-semibold">Falta el enlace de Google de tu restaurante</p>
          <p className="mt-1 text-sm text-ink-soft">
            Sin él, tu página no puede llevar a tus clientes a Google. En tu Perfil de Empresa de Google pulsa{" "}
            <strong>«Pedir reseñas»</strong>, copia el enlace y pégalo en Ajustes.
          </p>
          <Link href="/app/ajustes" className="mt-2 inline-block text-sm font-semibold text-brand underline underline-offset-4">
            Añadir el enlace en Ajustes
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="pagina">
        <h2 id="pagina" className="font-display text-xl font-bold">
          1. Tu página de reseñas
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Es la página que abren tus clientes. Tiene un botón grande para dejar la reseña en Google y, debajo, la opción de contarte algo en privado.
        </p>
        <p id="enlace" className="mt-3 break-all rounded-xl bg-sand px-4 py-3 font-mono text-sm">
          {pageUrl}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={pageUrl} targetId="enlace" label="Copiar enlace" />
          <a href={pageUrl} target="_blank" rel="noopener noreferrer" className={linkButton}>
            Ver mi página
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="qr">
        <h2 id="qr" className="font-display text-xl font-bold">
          2. Código QR para las mesas
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Imprímelo y ponlo en las mesas, la barra o junto a la cuenta. Al escanearlo con el móvil se abre tu página.
        </p>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className="w-44 shrink-0 rounded-xl border border-line bg-white p-2"
            role="img"
            aria-label="Código QR de tu página de reseñas"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="flex flex-wrap gap-2">
            <Link href="/app/kit/imprimir?tipo=mesa" className={linkButton}>
              Imprimir tarjetas para mesas
            </Link>
            <Link href="/app/kit/imprimir?tipo=ticket" className={linkButton}>
              Imprimir para el ticket
            </Link>
            <a href="/app/kit/qr?formato=png" className={linkButton} download>
              Descargar PNG
            </a>
            <a href="/app/kit/qr?formato=svg" className={linkButton} download>
              Descargar SVG (imprenta)
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="whatsapp">
        <h2 id="whatsapp" className="font-display text-xl font-bold">
          3. Mensaje para WhatsApp
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Mándalo a los clientes que reservaron o pidieron por WhatsApp, mejor el mismo día de la visita.
        </p>
        <ul className="mt-4 space-y-3">
          {templates.map((t, i) => (
            <li key={t.title} className="rounded-xl bg-sand p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t.title}</p>
              <p id={`plantilla-${i}`} className="mt-1 whitespace-pre-line">
                {t.text}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={t.text} targetId={`plantilla-${i}`} />
                <a href={whatsappShareUrl(t.text)} target="_blank" rel="noopener noreferrer" className={linkButton}>
                  Abrir en WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="comentarios">
        <h2 id="comentarios" className="font-display text-xl font-bold">
          Comentarios privados {unread > 0 && <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-sm text-brand-ink">{unread} nuevos</span>}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Lo que tus clientes te cuentan en privado desde tu página. No se publica en ningún sitio.</p>
        {(feedback ?? []).length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-soft">Aún no tienes comentarios privados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(feedback ?? []).map((f) => (
              <li key={f.id} className={`rounded-xl border p-4 ${f.read_at ? "border-line" : "border-brand"}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <time dateTime={f.created_at}>
                    {new Date(f.created_at).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                  </time>
                  {!f.read_at && <span className="font-semibold text-brand">Nuevo</span>}
                </div>
                <p className="mt-1 whitespace-pre-line">{f.message}</p>
                {f.contact && (
                  <p className="mt-2 text-sm">
                    Contacto: <span className="font-semibold">{f.contact}</span>
                    {!f.consent && <span className="text-ink-soft"> (no ha aceptado que le escribas)</span>}
                  </p>
                )}
                {!f.read_at && (
                  <form action={markFeedbackReadAction} className="mt-2">
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="text-sm font-semibold text-brand underline underline-offset-4">
                      Marcar como leído
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
