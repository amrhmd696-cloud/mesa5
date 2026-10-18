import { STATUS_LABELS, TOPIC_LABELS } from "@/lib/ai/labels";
import type { Topic } from "@/lib/ai/schema";

// Etiquetas pequeñas de las reseñas: estado y temas (verde = bien, rojo = queja).

export function StatusBadge({ status }: { status: keyof typeof STATUS_LABELS }) {
  const style = status === "answered" ? "bg-olive/15 text-olive" : "bg-star/20 text-ink";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{STATUS_LABELS[status]}</span>;
}

export function TopicChips({ topics }: { topics: { topic: Topic; polarity: "positivo" | "negativo" }[] }) {
  if (topics.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Temas">
      {topics.map(({ topic, polarity }) => (
        <li
          key={topic}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            polarity === "positivo" ? "bg-olive/10 text-olive" : "bg-wine/10 text-wine"
          }`}
        >
          {polarity === "positivo" ? "+" : "−"} {TOPIC_LABELS[topic]}
        </li>
      ))}
    </ul>
  );
}
