// Fila de estrellas (por ejemplo, la nota de una reseña).
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className ?? ""}`} aria-label={`${rating} de 5 estrellas`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={n <= rating ? "var(--star)" : "var(--line)"}
          />
        </svg>
      ))}
    </span>
  );
}
