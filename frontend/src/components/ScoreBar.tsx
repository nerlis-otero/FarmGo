import { RATING_DOT, type Rating } from "@/data/labels";

// Barra de progreso decorativa: ayuda a "ver" qué tan buena es una puntuación de un vistazo.
export default function ScoreBar({
  score,
  rating,
  className = "",
}: {
  score: number;
  rating: Rating;
  className?: string;
}) {
  const width = Math.max(4, Math.min(100, score));
  return (
    <div
      aria-hidden="true"
      className={`h-2 overflow-hidden rounded-full bg-navy/10 ${className}`}
    >
      <div
        className={`meter-fill h-full rounded-full ${RATING_DOT[rating]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
