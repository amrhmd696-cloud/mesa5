import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

// Se llega aquí desde el enlace del email de recuperación (ya con sesión iniciada).
export default function NewPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Crea una contraseña nueva</h1>
      <div className="mt-6">
        <NewPasswordForm />
      </div>
    </>
  );
}
