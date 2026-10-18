"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Aviso de cookies. Mesa5 solo usa cookies técnicas (sesión de Supabase),
// que no requieren consentimiento según la guía de la AEPD; por eso es un
// aviso informativo y no un selector. Si algún día se añade analítica o
// publicidad, este componente debe pasar a pedir consentimiento previo.

const KEY = "mesa5-cookie-notice";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "ok";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function CookieNotice({ text, more, accept }: { text: string; more: string; accept: string }) {
  // En el servidor devolvemos `true` para no pintar el aviso hasta que el navegador lo confirme.
  const dismissed = useSyncExternalStore(subscribe, read, () => true);
  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "ok");
    } catch {
      /* navegación privada: el aviso volverá a salir, sin problema */
    }
    listeners.forEach((l) => l());
  }

  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-surface p-4 shadow-lg">
      <p className="text-sm text-ink">
        {text}{" "}
        <Link href="/legal/cookies" className="font-medium text-brand underline underline-offset-2">
          {more}
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 min-h-11 w-full rounded-full bg-brand px-5 text-sm font-semibold text-brand-ink hover:bg-brand-strong sm:w-auto"
      >
        {accept}
      </button>
    </div>
  );
}
