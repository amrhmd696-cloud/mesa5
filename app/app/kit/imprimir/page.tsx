import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "@/components/kit/PrintButton";
import { getWorkspace, requireUser } from "@/lib/auth";
import { reviewPageUrl } from "@/lib/kit";

export const metadata: Metadata = { title: "Imprimir QR" };

// Hoja para imprimir: 4 tarjetas A6 para las mesas en un A4, o una tira de
// 72 mm para la impresora de tickets. Colores fijos (no cambian en modo oscuro).
// El texto invita a TODOS a opinar, sin preguntar antes si les gustó (política de Google).
export default async function PrintPage({ searchParams }: PageProps<"/app/kit/imprimir">) {
  await requireUser("/app/kit/imprimir");
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const { tipo } = await searchParams;
  const ticket = tipo === "ticket";
  const svg = await QRCode.toString(reviewPageUrl(ws.restaurant.slug, ticket ? "ticket" : "qr"), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div>
      <style>{`@page { size: ${ticket ? "80mm auto" : "A4"}; margin: ${ticket ? "4mm" : "0"}; }`}</style>
      <div className="mb-6 space-y-3 print:hidden">
        <Link href="/app/kit" className="text-sm font-medium text-ink-soft hover:text-brand">
          ← Kit de reseñas
        </Link>
        <h1 className="font-display text-3xl font-bold">{ticket ? "QR para el ticket" : "Tarjetas para las mesas"}</h1>
        <p className="text-ink-soft">
          {ticket
            ? "Imprímelo en tu impresora de tickets o descarga el PNG para añadirlo al pie del ticket en tu TPV."
            : "Se imprimen 4 tarjetas en un folio A4. Recórtalas por las líneas y ponlas en un portamenús o pegadas en la mesa."}
        </p>
        <PrintButton />
      </div>

      {ticket ? (
        <div className="mx-auto w-[72mm] bg-white p-[3mm] text-center text-black">
          <p className="text-[11pt] font-bold">{ws.restaurant.name}</p>
          <div className="mx-auto mt-[2mm] w-[38mm]" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-[2mm] text-[9pt] leading-snug">Tu opinión nos ayuda mucho. Escanea y déjanos tu reseña en Google. ¡Gracias!</p>
          <MadeWithMesa5 className="mt-[2mm]" />
        </div>
      ) : (
        <div className="mx-auto grid w-[210mm] max-w-full grid-cols-2 bg-white text-black print:max-w-none">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-[105/148] flex-col items-center justify-center border border-dashed border-black/30 p-[4mm] sm:p-[9mm] print:p-[9mm] text-center"
            >
              <p className="text-[9pt] tracking-[0.3em] text-[#e8a33d]">★★★★★</p>
              <p className="mt-[3mm] font-display text-[18pt] font-bold leading-tight">{ws.restaurant.name}</p>
              <p className="mt-[3mm] text-[11pt] leading-snug">Tu opinión nos ayuda mucho</p>
              <div className="mx-auto my-[5mm] w-full max-w-[52mm]" dangerouslySetInnerHTML={{ __html: svg }} />
              <p className="text-[11pt] font-semibold leading-snug">Escanea y déjanos tu reseña en Google</p>
              <p className="mt-[2mm] text-[9pt] text-black/60">¡Gracias por tu visita!</p>
              <MadeWithMesa5 className="mt-[4mm]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Firma pequeña de Mesa5 al pie: otros restaurantes la ven y pueden apuntarse.
// Colores claros fijos para que se imprima igual aunque el móvil esté en modo oscuro.
const LIGHT_LOGO = { "--ink": "#2b211c", "--brand": "#c4532f", "--star": "#e8a33d" } as React.CSSProperties;

function MadeWithMesa5({ className }: { className?: string }) {
  return (
    <div className={`text-[7.5pt] leading-tight text-black/55 ${className ?? ""}`} style={LIGHT_LOGO}>
      <p className="flex items-center justify-center gap-[1mm]">
        <LogoMark className="h-[5mm] w-[5mm]" />
        Hecho con <span className="font-display font-bold text-black/80">Mesa<span className="text-[#c4532f]">5</span></span>
      </p>
      <p>¿Tienes un restaurante? mesa5.app</p>
    </div>
  );
}
