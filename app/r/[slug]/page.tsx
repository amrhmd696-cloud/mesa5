import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { FeedbackForm } from "@/components/kit/FeedbackForm";
import { getPublicRestaurant } from "@/lib/kit";

// Página que abre el cliente al escanear el QR o pulsar el enlace de WhatsApp.
//
// ⚠️ POLÍTICA DE GOOGLE (no cambiar sin leer esto): a TODOS los clientes se les
// enseña el mismo botón para dejar reseña en Google, sin preguntarles antes qué
// tal fue ni cuántas estrellas darían. Filtrar a los clientes contentos hacia
// Google y a los descontentos hacia un formulario privado ("review gating")
// está prohibido por Google y puede hacer que borren las reseñas del negocio.
// El comentario privado es opcional, secundario y va siempre DEBAJO del botón.

export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);
  return {
    title: restaurant ? `Tu opinión sobre ${restaurant.name}` : "Restaurante no encontrado",
    // Es una página para los clientes del local, no para buscadores.
    robots: { index: false, follow: false },
  };
}

export default function ReviewKitPage({ params }: PageProps<"/r/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando" />}>
        <ReviewKit params={params} />
      </Suspense>
      <footer className="mt-auto pt-10 text-center text-xs text-ink-soft">
        <Link href="/" className="inline-flex items-center gap-2 opacity-80 hover:opacity-100">
          Con la ayuda de <Logo className="h-5 w-auto" />
        </Link>
      </footer>
    </main>
  );
}

async function ReviewKit({ params }: { params: PageProps<"/r/[slug]">["params"] }) {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) notFound();

  return (
    <div className="text-center">
      {restaurant.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={restaurant.logoUrl} alt="" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
      )}
      <h1 className="font-display text-3xl font-bold">{restaurant.name}</h1>
      {restaurant.city && <p className="mt-1 text-ink-soft">{restaurant.city}</p>}

      <p className="mt-6 text-lg">¡Gracias por tu visita! Tu opinión en Google nos ayuda muchísimo a que nos conozcan.</p>

      {restaurant.googleUrl ? (
        <a
          href={restaurant.googleUrl}
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-brand px-6 text-lg font-semibold text-brand-ink shadow-sm hover:bg-brand-strong"
        >
          <span aria-hidden="true">★</span> Déjanos tu reseña en Google
        </a>
      ) : (
        <p className="mt-6 rounded-2xl bg-sand p-4 text-sm">El enlace a Google de este restaurante estará disponible muy pronto.</p>
      )}

      <details className="mt-10 rounded-2xl border border-line bg-surface p-4 text-left">
        <summary className="cursor-pointer text-center text-sm font-medium text-ink-soft">
          ¿Prefieres contarnos algo en privado?
        </summary>
        <div className="mt-4">
          <FeedbackForm slug={restaurant.slug} restaurantName={restaurant.name} />
        </div>
      </details>
    </div>
  );
}
