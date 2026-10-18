// Logo de Mesa5: cinco estrellas en arco sobre una mesa con mantel.
// `variant="mark"` muestra solo el símbolo (favicon, avatar, QR).

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  title?: string;
}

const STAR =
  "M0 -6.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L0 3.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z";

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
      {/* mantel */}
      <path d="M6 33h52l-4.5 11h-43z" fill="var(--brand)" />
      <path d="M14 44l2 4M24 44l1 4M32 44v4M40 44l-1 4M50 44l-2 4" stroke="var(--brand-strong)" strokeWidth="1.6" strokeLinecap="round" />
      {/* patas */}
      <path d="M15 48v10M49 48v10" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
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
