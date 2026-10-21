"use client";

import { useState } from "react";

// Copia un texto al portapapeles. Si el navegador no deja, selecciona el
// elemento `targetId` para copiarlo a mano.
export function CopyButton({ text, targetId, label = "Copiar" }: { text: string; targetId?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = targetId ? document.getElementById(targetId) : null;
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-10 items-center rounded-full border border-ink/20 px-4 text-sm font-semibold hover:border-brand hover:text-brand"
    >
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
