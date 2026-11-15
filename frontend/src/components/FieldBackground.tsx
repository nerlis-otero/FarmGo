export default function FieldBackground() {
  const rows = Array.from({ length: 23 }, (_, i) => i - 11);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#e7f2ef] via-[#f7f7ef] to-[#e9f0e5]"
    >
      <div className="absolute right-[12%] top-24 h-28 w-28 rounded-full bg-[#f2d99c]/45 blur-[1px] sm:h-40 sm:w-40" />
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 h-48 w-full opacity-90 sm:h-60 md:h-72"
      >
        <defs>
          <linearGradient id="field-front" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#80ae7d" />
            <stop offset="100%" stopColor="#4c815b" />
          </linearGradient>
          <clipPath id="field-rows">
            <path d="M0 215 Q360 170 720 195 T1440 180 V320 H0 Z" />
          </clipPath>
        </defs>

        <path d="M0 150 Q300 90 620 140 T1440 110 V320 H0 Z" fill="#b5cfaa" fillOpacity="0.48" />
        <path d="M0 185 Q400 130 760 170 T1440 150 V320 H0 Z" fill="#91b488" fillOpacity="0.48" />
        <path d="M0 215 Q360 170 720 195 T1440 180 V320 H0 Z" fill="url(#field-front)" />

        <g
          clipPath="url(#field-rows)"
          fill="none"
          stroke="#f8f4dc"
          strokeOpacity="0.3"
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