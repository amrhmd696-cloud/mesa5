import Link from "next/link";
import { Logo } from "@/components/Logo";

// Diseño de las páginas de acceso: logo arriba y una tarjeta centrada.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-14">
      <Link href="/" aria-label="Mesa5, inicio">
        <Logo />
      </Link>
      <div className="mt-8 w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
