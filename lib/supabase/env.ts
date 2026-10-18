// Datos públicos del proyecto de Supabase. Son seguros en el navegador:
// la protección real la hace Row Level Security en la base de datos.
// Se acepta la "publishable key" nueva o la "anon key" clásica.

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL (mira .env.example)");
  return url;
}

export function supabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (mira .env.example)");
  return key;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
