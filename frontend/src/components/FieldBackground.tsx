export default function FieldBackground() {
  const rows = Array.from({ length: 23 }, (_, i) => i - 11);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#dcedfb] via-page to-[#f4f8d3]"
    >
      {/* Sol de limón con un brillo suave */}
      <div className="sun absolute right-[12%] top-20 h-28 w-28 animate-[sun-glow_7s_ease-in-out_infinite] rounded-full bg-straw/70 shadow-[0_0_80px_28px_rgb(225_234_123/45%)] sm:h-40 sm:w-40" />

      {/* Nubes que pasan despacio */}
      <div className="cloud absolute left-0 top-28 h-6 w-28 animate-[drift_90s_linear_infinite] rounded-full bg-white/70 blur-[2px] sm:w-44" />
      <div className="cloud absolute left-0 top-52 h-5 w-20 animate-[drift_130s_linear_infinite] rounded-full bg-white/60 blur-[2px] [animation-delay:-60s] sm:w-32" />

      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 h-48 w-full sm:h-60 md:h-72"
      >
        <defs>
          <linearGradient id="field-front" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6c9a45" />
            <stop offset="100%" stopColor="#447027" />
          </linearGradient>
          <clipPath id="field-rows">
            <path d="M0 215 Q360 170 720 195 T1440 180 V320 H0 Z" />
          </clipPath>
        </defs>

        <g className="hill-sway animate-[sway_16s_ease-in-out_infinite]">
          <path d="M-40 150 Q300 90 620 140 T1480 110 V320 H-40 Z" fill="#52aae9" fillOpacity="0.28" />
          <path d="M-40 185 Q400 130 760 170 T1480 150 V320 H-40 Z" fill="#e1ea7b" fillOpacity="0.6" />
        </g>
        <path d="M0 215 Q360 170 720 195 T1440 180 V320 H0 Z" fill="url(#field-front)" />

        <g
          clipPath="url(#field-rows)"
          fill="none"
          stroke="#e1ea7b"
          strokeOpacity="0.4"
          strokeWidth="2"
        >
          {rows.map((row) => (
            <path
              key={row}
              d={`M${720 + row * 150} 325 Q${720 + row * 65} 235 ${720 + row * 7} 180`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
