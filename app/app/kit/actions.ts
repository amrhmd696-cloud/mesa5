"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marca un comentario privado como leído (RLS: solo los de nuestro restaurante). */
export async function markFeedbackReadAction(formData: FormData): Promise<void> {
  const ws = await getWorkspace();
  if (!ws) return;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("private_feedback").update({ read_at: new Date().toISOString() }).eq("id", id.data);
  if (error) console.error("[comentarios] leído", error.message);
  refresh();
}
