import { ImageResponse } from "next/og";

// Imagen que aparece al compartir Mesa5 en WhatsApp, redes, etc.
export const alt = "Mesa5: más reseñas, mejores respuestas, más clientes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAR = "M0 -6.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L0 3.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z";
const STARS = [
  [10, 21],
  [20.5, 13.5],
  [32, 10.5],
  [43.5, 13.5],
  [54, 21],
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#fff8ef",
          color: "#2b211c",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="140" height="140" viewBox="0 0 64 64">
            <g fill="#e8a33d">
              {STARS.map(([x, y]) => (
                <path key={x} d={STAR} transform={`translate(${x} ${y})`} />
              ))}
            </g>
            <path d="M6 33h52l-4.5 11h-43z" fill="#c4532f" />
            <path d="M15 48v10M49 48v10" stroke="#2b211c" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 700 }}>
            Mesa<span style={{ color: "#c4532f" }}>5</span>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 52, lineHeight: 1.2, maxWidth: 1000 }}>
          Más reseñas, mejores respuestas, más clientes
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#5c4d44" }}>
          Responde tus reseñas de Google en segundos · Prueba gratis 14 días
        </div>
      </div>
    ),
    size,
  );
}
