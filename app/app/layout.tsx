import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/Logo";
import { getWorkspace } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Tu panel", template: "%s · Mesa5" }, robots: { index: false } };

// Zona privada. El proxy ya impide entrar sin sesión; cada página vuelve a
// comprobarlo en el servidor antes de leer datos.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/app" aria-label="Mesa5, tu panel">
            <Logo />
          </Link>
          <nav aria-label="Panel" className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/app/resenas" className="min-h-10 rounded-full px-3 py-2 hover:text-brand">
              Reseñas
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Suspense fallback={null}>
              <RestaurantName />
            </Suspense>
            <form action={logout}>
              <button type="submit" className="min-h-10 rounded-full px-3 text-sm font-medium text-ink-soft hover:text-brand">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Suspense fallback={<AppLoading />}>{children}</Suspense>
      </main>
    </>
  );
}

async function RestaurantName() {
  const ws = await getWorkspace();
  if (!ws) return null;
  return (
    <Link href="/app/ajustes" className="hidden max-w-40 truncate text-sm font-semibold sm:inline">
      {ws.restaurant.name}
    </Link>
  );
}

function AppLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-sand" />
      <div className="h-32 animate-pulse rounded-2xl bg-sand" />
      <div className="h-32 animate-pulse rounded-2xl bg-sand" />
    </div>
  );
}
