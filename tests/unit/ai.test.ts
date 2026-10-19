import { readFileSync } from "node:fs";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import { checkReply, countSentences, ensureSignature } from "@/lib/ai/check-reply";
import { estimateCostEur } from "@/lib/ai/models";
import { SYSTEM_PROMPT, buildAdjustPrompt, buildReplyPrompt, type RestaurantProfile } from "@/lib/ai/prompts";
import { replyOutputSchema } from "@/lib/ai/schema";
import { plans } from "@/lib/billing/plans";

const profile: RestaurantProfile = {
  name: "La Parrilla",
  cuisine: "Asador / Brasa",
  city: "Sevilla",
  tone: "cercano",
  signature: "Carlos, del equipo de La Parrilla",
  starDishes: ["Chuletón", "Pimientos de Padrón"],
  usefulInfo: { whatsapp: "+34 600 123 456", reservas: "Por teléfono" },
};

const good =
  "¡Gracias, Lucía! Nos alegra mucho que el chuletón te encantara. Sentimos la espera con la cuenta; ya lo hemos hablado con el equipo.\nCarlos, del equipo de La Parrilla";

describe("checkReply", () => {
  it("acepta una respuesta correcta", () => {
    expect(checkReply(good, profile)).toEqual({ ok: true, issues: [] });
  });

  it("rechaza promesas que no están en la ficha", () => {
    for (const bad of [
      "Gracias por venir. La próxima vez te hacemos un 20% de descuento.",
      "Lo sentimos mucho. Te invitamos a un café en tu próxima visita.",
      "Sorry about that. Next time dessert is on the house.",
      "Lo sentimos de verdad. Te devolveremos el dinero de la cena.",
    ]) {
      expect(checkReply(bad, profile).ok, bad).toBe(false);
    }
  });

  it("permite invitar a hablar en privado", () => {
    const reply = "Sentimos mucho lo ocurrido con la espera. Te invitamos a escribirnos por WhatsApp al +34 600 123 456 para hablarlo.";
    expect(checkReply(reply, profile)).toEqual({ ok: true, issues: [] });
  });

  it("permite ofertas que sí están en la ficha", () => {
    const withOffer = { ...profile, usefulInfo: { ...profile.usefulInfo, ofertas: "Menú del día con 10% de descuento" } };
    const reply = "Gracias por tu visita. Recuerda que el menú del día tiene un 10% de descuento entre semana.";
    expect(checkReply(reply, withOffer).ok).toBe(true);
  });

  it("rechaza huecos sin rellenar, teléfonos y enlaces inventados", () => {
    expect(checkReply("Gracias, [NOMBRE]. Te esperamos pronto.", profile).ok).toBe(false);
    expect(checkReply("Gracias por todo. Llámanos al 912 345 678 cuando quieras.", profile).ok).toBe(false);
    expect(checkReply("Gracias por venir. Mira nuestra carta en https://ejemplo.com/carta.", profile).ok).toBe(false);
  });

  it("controla la longitud", () => {
    expect(checkReply("Gracias.", profile).ok).toBe(false);
    const long = Array.from({ length: 9 }, (_, i) => `Frase número ${i + 1} de una respuesta demasiado larga.`).join(" ");
    expect(checkReply(long, profile).issues).toContain("La respuesta tiene más de 5 frases.");
  });
});

describe("countSentences y ensureSignature", () => {
  it("cuenta frases en español con signos de apertura", () => {
    expect(countSentences("¡Gracias, Ana! ¿Volverás pronto? Te esperamos.")).toBe(3);
  });

  it("añade la firma solo si falta", () => {
    expect(ensureSignature("Gracias por venir.", "El equipo")).toBe("Gracias por venir.\nEl equipo");
    expect(ensureSignature(good, profile.signature)).toBe(good);
    expect(ensureSignature("Gracias.", null)).toBe("Gracias.");
  });
});

describe("prompts", () => {
  it("el prompt del sistema no depende del restaurante (para la caché)", () => {
    expect(SYSTEM_PROMPT).not.toContain("La Parrilla");
    expect(SYSTEM_PROMPT).toMatch(/mismo idioma/);
    expect(SYSTEM_PROMPT).toMatch(/No prometas nada/);
  });

  it("el mensaje lleva la ficha y la reseña", () => {
    const prompt = buildReplyPrompt(profile, { authorName: "Lucía", rating: 2, text: "Tardaron mucho." });
    expect(prompt).toContain("Nombre: La Parrilla");
    expect(prompt).toContain("Platos estrella: Chuletón, Pimientos de Padrón");
    expect(prompt).toContain("Estrellas: 2 de 5");
    expect(prompt).toContain("Tardaron mucho.");
  });

  it("los reintentos incluyen lo que falló", () => {
    const prompt = buildAdjustPrompt(profile, { authorName: null, rating: 5, text: "Genial" }, good, "shorter", ["Demasiado larga."]);
    expect(prompt).toContain("<respuesta_actual>");
    expect(prompt).toContain("Demasiado larga.");
  });
});

describe("salida estructurada", () => {
  it("genera un JSON Schema sin restricciones que la API no admite", () => {
    const schema = JSON.stringify(zodOutputFormat(replyOutputSchema));
    expect(schema).toContain('"replies"');
    expect(schema).not.toMatch(/minLength|maxLength|minItems|maxItems|pattern/);
  });
});

describe("costes y límites", () => {
  it("estima el coste en euros", () => {
    const cost = estimateCostEur("claude-haiku-5-5", 1_000_000, 1_000_000);
    expect(cost).toBeGreaterThan(0.4);
    expect(cost).toBeLessThan(0.7);
    expect(estimateCostEur("modelo-desconocido", 1000, 0)).toBeGreaterThan(estimateCostEur("claude-haiku-5-5", 1000, 0));
  });

  it("el límite del plan Básico en SQL coincide con plans.ts", () => {
    const sql = readFileSync("supabase/migrations/20261018000003_respuestas.sql", "utf8");
    expect(sql).toContain(`when 'basic' then ${plans.basic.monthlyReplies}`);
    expect(plans.pro.monthlyReplies).toBeNull();
    expect(plans.multi.monthlyReplies).toBeNull();
  });
});
