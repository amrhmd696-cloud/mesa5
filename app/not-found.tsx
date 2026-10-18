import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <LogoMark className="h-20 w-20" />
      <h1 className="mt-6 font-display text-3xl font-bold">Esta mesa no está reservada</h1>
      <p className="mt-3 text-ink-soft">No encontramos la página que buscas.</p>
      <Link href="/" className="mt-8 font-semibold text-brand underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
