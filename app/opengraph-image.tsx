import { ImageResponse } from "next/og";

// Imagen que aparece al compartir Mesa5 en WhatsApp, redes, etc.
export const alt = "Mesa5: más reseñas, mejores respuestas, más clientes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAR = "M0 -6.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L0 3.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z";
const LEG =
  "M10.4 36.8C7.9 40.8 9.2 44.4 11.8 47.8C13.4 50.2 13.2 54 11 58.4L9 59.8H13.6C15.6 55 15.8 50.4 14.8 47.2C13.8 44.2 13.4 40.4 14.8 36.8Z";
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
            <rect x="6" y="30.6" width="52" height="2.8" rx="1.4" fill="#2b211c" />
            <path d="M9 33.4H55V37Q45 37 38.6 39.3Q35 40.6 32 42.6Q29 40.6 25.4 39.3Q19 37 9 37Z" fill="#c4532f" />
            <path d="M9.4 35.2H54.6" stroke="#e8a33d" strokeWidth=".8" />
            <circle cx="32" cy="38.9" r="1.1" fill="#e8a33d" />
            <path d={LEG} fill="#2b211c" />
            <path d={LEG} fill="#2b211c" transform="matrix(-1 0 0 1 64 0)" />
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
