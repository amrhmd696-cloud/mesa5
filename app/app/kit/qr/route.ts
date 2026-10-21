import QRCode from "qrcode";
import { getWorkspace } from "@/lib/auth";
import { reviewPageUrl } from "@/lib/kit";

// Descarga del QR del restaurante: /app/kit/qr?formato=png|svg&origen=qr|ticket
// PNG grande (2000 px) para imprenta; SVG para que no pierda calidad nunca.
export async function GET(request: Request) {
  const ws = await getWorkspace();
  if (!ws) return new Response("No autorizado", { status: 401 });

  const params = new URL(request.url).searchParams;
  const format = params.get("formato") === "svg" ? "svg" : "png";
  const source = params.get("origen") === "ticket" ? "ticket" : "qr";
  const url = reviewPageUrl(ws.restaurant.slug, source);
  const filename = `qr-${ws.restaurant.slug}${source === "ticket" ? "-ticket" : ""}.${format}`;
  const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#2b211c", light: "#ffffff" } };

  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };
  if (format === "svg") {
    const svg = await QRCode.toString(url, { ...options, type: "svg" });
    return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  const png = await QRCode.toBuffer(url, { ...options, type: "png", width: 2000 });
  return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
}
