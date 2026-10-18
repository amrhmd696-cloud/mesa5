"use client";

import { useActionState, useState } from "react";
import { generateRepliesAction } from "@/app/app/resenas/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/fields";

// Formulario para pegar una reseña: estrellas, nombre del cliente y texto.

export function NewReviewForm() {
  const [state, action] = useActionState(generateRepliesAction, undefined);
  const [rating, setRating] = useState(0);

  // Tras enviar, React vacía el formulario. La clave cambia con cada respuesta
  // del servidor para volver a poner lo escrito si algo ha fallado.
  return (
    <form key={state?.at ?? "nuevo"} action={action} className="space-y-5">
      <fieldset>
        <legend className="block text-sm font-semibold">Estrellas de la reseña</legend>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                required
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-11 w-11 rounded-lg p-1 peer-focus-visible:outline-2 peer-focus-visible:outline-brand"
              >
                <path
                  d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
                  fill={n <= rating ? "var(--star)" : "var(--line)"}
                />
              </svg>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Nombre del cliente (opcional)" name="authorName" maxLength={120} autoComplete="off" placeholder="Lucía M." defaultValue={state?.values?.authorName} />

      <div>
        <label htmlFor="text" className="block text-sm font-semibold">
          Texto de la reseña
        </label>
        <textarea
          id="text"
          name="text"
          required
          maxLength={5000}
          rows={6}
          defaultValue={state?.values?.text}
          placeholder="Pega aquí la reseña tal cual aparece en Google"
          className="mt-1.5 block w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-2 focus:outline-brand/30"
        />
      </div>

      <FormMessage state={state} />
      <SubmitButton pendingText="Escribiendo respuestas…">Generar respuestas</SubmitButton>
    </form>
  );
}
