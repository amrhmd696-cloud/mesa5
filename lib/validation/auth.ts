import { z } from "zod";

// Reglas de los formularios de acceso. Los mensajes van en español
// porque se muestran directamente al usuario.

const email = z.string().trim().toLowerCase().email("Escribe un email válido").max(254);
const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña").max(72),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email,
  password,
  acceptTerms: z.literal("on", { message: "Debes aceptar los términos y la política de privacidad" }),
});

export const recoverSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

/** Primer mensaje de error de un resultado de Zod. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario";
}
