// Contenedor común para las páginas legales (escritas en .mdx).
export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="mb-6 rounded-xl border border-star/60 bg-star/10 p-3 text-sm">
        <strong>Plantilla pendiente de revisión.</strong> Este texto es un modelo orientativo y debe revisarse
        (idealmente con un profesional) antes de lanzar Mesa5 con clientes reales.
      </p>
      <div className="prose-mesa">{children}</div>
    </div>
  );
}
