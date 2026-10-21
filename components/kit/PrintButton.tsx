"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 font-semibold text-brand-ink hover:bg-brand-strong"
    >
      Imprimir o guardar como PDF
    </button>
  );
}
