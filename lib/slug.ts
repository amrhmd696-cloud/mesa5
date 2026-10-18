// Convierte un nombre en un trozo de URL: "Café Lúa & Co." → "cafe-lua-co".
// Se usa para la página pública de cada restaurante (mesa5.app/r/<slug>).
export function slugify(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return slug.length >= 2 ? slug : `restaurante-${slug || "mesa5"}`;
}
