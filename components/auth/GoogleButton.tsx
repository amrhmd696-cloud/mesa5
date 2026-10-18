import { loginWithGoogle } from "@/app/(auth)/actions";

// Botón "Continuar con Google". Funciona también sin JavaScript (es un formulario).
export function GoogleButton({ next }: { next: string }) {
  return (
    <form action={loginWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface px-6 text-base font-semibold text-ink hover:border-brand"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continuar con Google
      </button>
    </form>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft" aria-hidden="true">
      <span className="h-px flex-1 bg-line" /> o con tu email <span className="h-px flex-1 bg-line" />
    </div>
  );
}
