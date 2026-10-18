// Logo de Mesa5: cinco estrellas en arco sobre una mesa clásica y elegante.
// `variant="mark"` muestra solo el símbolo (favicon, avatar, QR).

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  title?: string;
}

const STAR =
  "M0 -6.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L0 3.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z";

// Pata curva (cabriolé) de la mesa
const LEG =
  "M10.4 36.8C7.9 40.8 9.2 44.4 11.8 47.8C13.4 50.2 13.2 54 11 58.4L9 59.8H13.6C15.6 55 15.8 50.4 14.8 47.2C13.8 44.2 13.4 40.4 14.8 36.8Z";

// Posiciones de las 5 estrellas formando un arco
const STARS = [
  { x: 10, y: 21 },
  { x: 20.5, y: 13.5 },
  { x: 32, y: 10.5 },
  { x: 43.5, y: 13.5 },
  { x: 54, y: 21 },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="var(--star)">
        {STARS.map((s) => (
          <path key={s.x} d={STAR} transform={`translate(${s.x} ${s.y})`} />
        ))}
      </g>
      {/* tablero */}
      <rect x="6" y="30.6" width="52" height="2.8" rx="1.4" fill="var(--ink)" />
      {/* faldón con arco central y ribete dorado */}
      <path d="M9 33.4H55V37Q45 37 38.6 39.3Q35 40.6 32 42.6Q29 40.6 25.4 39.3Q19 37 9 37Z" fill="var(--brand)" />
      <path d="M9.4 35.2H54.6" stroke="var(--star)" strokeWidth=".8" />
      <circle cx="32" cy="38.9" r="1.1" fill="var(--star)" />
      {/* patas curvas estilo clásico (la derecha es la izquierda reflejada) */}
      <path d={LEG} fill="var(--ink)" />
      <path d={LEG} fill="var(--ink)" transform="matrix(-1 0 0 1 64 0)" />
    </svg>
  );
}

export function Logo({ variant = "full", className, title = "Mesa5" }: LogoProps) {
  if (variant === "mark") return <LogoMark className={className} />;
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`} aria-label={title} role="img">
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-2xl font-bold tracking-tight text-ink">
        Mesa<span className="text-brand">5</span>
      </span>
    </span>
  );
}
