import type { Priority } from "@/types/contracts";

const PATHS: Record<Priority, string[]> = {
  "Water Saving": ["M12 3c3.5 4.2 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 8.5 7.2 12 3z"],
  Profit: [
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    "M12 7v10",
    "M14.6 9.4c0-1-1-1.7-2.6-1.7s-2.6.7-2.6 1.7 1 1.5 2.6 1.9 2.6.9 2.6 1.9-1 1.7-2.6 1.7-2.6-.7-2.6-1.7",
  ],
  "Soil Health": [
    "M12 21v-8",
    "M12 13c0-4-3-6-7-6 0 4 3 6 7 6z",
    "M12 15c0-3 2.5-5 6-5 0 3-2.5 5-6 5z",
  ],
  Balanced: [
    "M12 4v16",
    "M6 20h12",
    "M5 8h14",
    "M5 8l-3 7a3.5 3.5 0 0 0 6 0L5 8z",
    "M19 8l-3 7a3.5 3.5 0 0 0 6 0l-3-7z",
  ],
};

// Icono decorativo para cada objetivo: se entiende sin leer.
export default function PriorityIcon({ id }: { id: Priority }) {
  return (
    <span
      aria-hidden="true"
      className="icon-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-indigo"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[id].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
