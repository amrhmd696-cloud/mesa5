"use client";

import { useActionState, useRef, useState } from "react";
import { completeOnboarding, updateRestaurant } from "@/app/app/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/fields";

// Formulario del restaurante. En el onboarding se muestra en 3 pasos cortos;
// en Ajustes, todo seguido. Los pasos ocultos siguen dentro del <form>, así
// que todo se envía junto al final.

export interface RestaurantDefaults {
  name?: string;
  cuisine?: string | null;
  city?: string | null;
  googleUrl?: string | null;
  tone?: "cercano" | "formal" | "divertido";
  signature?: string | null;
  starDishes?: string[];
  hours?: string;
  bookings?: string;
  whatsapp?: string;
}

const CUISINES = [
  "Mediterránea", "Tapas y raciones", "Asador / Brasa", "Marisquería", "Arrocería", "Italiana / Pizzería",
  "Mexicana", "Argentina", "Peruana", "Japonesa / Sushi", "China", "India", "Hamburguesería",
  "Vegetariana / Vegana", "Cafetería / Brunch", "Bar", "Pastelería",
];

const TONE_OPTIONS = [
  { value: "cercano", label: "Cercano", example: "¡Gracias, Lucía! Nos alegra un montón que te gustara la paella." },
  { value: "formal", label: "Formal", example: "Estimada Lucía, le agradecemos sinceramente su valoración." },
  { value: "divertido", label: "Divertido", example: "¡Lucía, nos has alegrado el servicio! La paella te manda saludos 🥘" },
] as const;

const STEPS = ["Tu restaurante", "Cómo respondes", "Datos útiles"];

export function RestaurantForm({
  mode,
  defaults = {},
  ownerName,
}: {
  mode: "onboarding" | "settings";
  defaults?: RestaurantDefaults;
  ownerName?: string | null;
}) {
  const [state, action] = useActionState(mode === "onboarding" ? completeOnboarding : updateRestaurant, undefined);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaults.name ?? "");
  const [signatureTouched, setSignatureTouched] = useState(Boolean(defaults.signature));
  const [signature, setSignature] = useState(defaults.signature ?? "");
  const stepRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const isOnboarding = mode === "onboarding";

  // Sugerencia de firma mientras no la cambie el usuario: "Carlos, del equipo de La Parrilla"
  const firstName = ownerName?.split(" ")[0];
  const suggestedSignature = name ? (firstName ? `${firstName}, del equipo de ${name}` : `El equipo de ${name}`) : "";
  const signatureValue = signatureTouched ? signature : suggestedSignature;

  function goNext() {
    // Comprueba los campos del paso actual antes de avanzar
    const fields = stepRefs.current[step]?.querySelectorAll("input, select, textarea") ?? [];
    for (const el of fields) {
      if (!(el as HTMLInputElement).reportValidity()) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const visible = (i: number) => !isOnboarding || step === i;

  return (
    <form action={action} className="space-y-6">
      {isOnboarding && (
        <div>
          <p className="text-sm font-medium text-ink-soft">
            Paso {step + 1} de {STEPS.length} · {STEPS[step]}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
            ))}
          </div>
        </div>
      )}

      {/* PASO 1 */}
      <fieldset ref={(el) => { stepRefs.current[0] = el; }} className={`space-y-4 ${visible(0) ? "" : "hidden"}`}>
        {!isOnboarding && <legend className="mb-2 font-display text-xl font-bold">Tu restaurante</legend>}
        <Field label="Nombre del restaurante" name="name" required minLength={2} maxLength={120} value={name}
          onChange={(e) => setName(e.target.value)} placeholder="La Parrilla" autoComplete="organization" />
        <div>
          <Field label="Tipo de cocina" name="cuisine" list="cocinas" maxLength={60}
            defaultValue={defaults.cuisine ?? ""} placeholder="Ej.: Tapas y raciones" />
          <datalist id="cocinas">{CUISINES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <Field label="Ciudad" name="city" maxLength={80} defaultValue={defaults.city ?? ""} placeholder="Sevilla" autoComplete="address-level2" />
        <Field label="Enlace a tu ficha de Google (opcional)" name="googleUrl" type="url" inputMode="url"
          defaultValue={defaults.googleUrl ?? ""} placeholder="https://g.page/r/…/review"
          hint={<>En tu Perfil de Empresa de Google pulsa <strong>«Pedir reseñas»</strong> y copia el enlace. Puedes añadirlo después.</>} />
      </fieldset>

      {/* PASO 2 */}
      <fieldset ref={(el) => { stepRefs.current[1] = el; }} className={`space-y-4 ${visible(1) ? "" : "hidden"}`}>
        <legend className="mb-2 font-display text-xl font-bold">{isOnboarding ? "¿Cómo quieres sonar?" : "Cómo respondes"}</legend>
        <div className="space-y-3" role="radiogroup" aria-label="Tono de las respuestas">
          {TONE_OPTIONS.map((t) => (
            <label key={t.value} className="flex cursor-pointer gap-3 rounded-2xl border border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
              <input type="radio" name="tone" value={t.value} defaultChecked={(defaults.tone ?? "cercano") === t.value}
                className="mt-1 h-5 w-5 accent-[var(--brand)]" required />
              <span>
                <span className="block font-semibold">{t.label}</span>
                <span className="mt-1 block text-sm text-ink-soft">“{t.example}”</span>
              </span>
            </label>
          ))}
        </div>
        <Field label="Firma de las respuestas" name="signature" maxLength={120} value={signatureValue}
          onChange={(e) => { setSignatureTouched(true); setSignature(e.target.value); }}
          placeholder="Carlos, del equipo de La Parrilla" />
        <Field label="Platos estrella (separados por comas)" name="starDishes" maxLength={400}
          defaultValue={(defaults.starDishes ?? []).join(", ")} placeholder="Chuletón, pimientos de Padrón, tarta de queso"
          hint="La IA los mencionará con naturalidad cuando encaje. Hasta 5." />
      </fieldset>

      {/* PASO 3 */}
      <fieldset ref={(el) => { stepRefs.current[2] = el; }} className={`space-y-4 ${visible(2) ? "" : "hidden"}`}>
        <legend className="mb-2 font-display text-xl font-bold">Datos útiles {isOnboarding && <span className="text-base font-normal text-ink-soft">(opcional)</span>}</legend>
        <p className="text-sm text-ink-soft">Los usaremos para invitar a contactar en privado en las reseñas negativas.</p>
        <Field label="Horario" name="hours" maxLength={200} defaultValue={defaults.hours ?? ""} placeholder="Martes a domingo, 13:00–16:00 y 20:00–23:30" />
        <Field label="Reservas (teléfono o web)" name="bookings" maxLength={200} defaultValue={defaults.bookings ?? ""} placeholder="954 000 000 o www.laparrilla.es" />
        <Field label="WhatsApp" name="whatsapp" type="tel" inputMode="tel" maxLength={30} defaultValue={defaults.whatsapp ?? ""} placeholder="+34 600 000 000" autoComplete="tel" />
      </fieldset>

      <FormMessage state={state} />

      {isOnboarding ? (
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)}
              className="min-h-12 rounded-full border border-line bg-surface px-6 font-semibold hover:border-brand">
              Atrás
            </button>
          )}
          <div className="flex-1">
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext}
                className="min-h-12 w-full rounded-full bg-brand px-6 font-semibold text-brand-ink hover:bg-brand-strong">
                Siguiente
              </button>
            ) : (
              <SubmitButton pendingText="Preparando tu panel…">Empezar a usar Mesa5</SubmitButton>
            )}
          </div>
        </div>
      ) : (
        <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
      )}
    </form>
  );
}
