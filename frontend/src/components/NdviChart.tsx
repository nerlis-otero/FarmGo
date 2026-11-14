import type { NdviPoint } from "@/types/recommendation";

const W = 360;
const H = 170;
const PAD = { l: 10, r: 10, t: 12, b: 26 };
const NAVY = "#102a56";
const LINE = "#00824c";
const BARE = "#8A6A4A";
const STRESS = "#B7791F";

export default function NdviChart({ data }: { data: NdviPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-mist p-4">
        There’s no data for this farm yet.
      </div>
    );
  }

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) =>
    PAD.l + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.t + (1 - Math.min(Math.max(v, 0), 1)) * innerH;
  const path = data
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Chart showing how green and healthy the field is each month, with bare-field and crop-stress months marked"
      >
        {[0, 1].map((t) => (
          <line key={t} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={NAVY} strokeOpacity="0.2" />
        ))}
        <text x={PAD.l + 2} y={PAD.t + 11} fontSize="10" fill={NAVY} fillOpacity="0.7">
          Greener
        </text>
        <text x={PAD.l + 2} y={H - PAD.b - 4} fontSize="10" fill={NAVY} fillOpacity="0.7">
          Less green
        </text>
        <path d={path} fill="none" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
        {data.map((p, i) => (
          <g key={p.month}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={p.flag ? 6 : 3}
              fill={p.flag === "bare" ? BARE : p.flag === "stress" ? STRESS : LINE}
              stroke={p.flag ? NAVY : "none"}
              strokeWidth="1.5"
            />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={NAVY}>
              {p.month}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: BARE }} />
          Bare field
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: STRESS }} />
          Crop stress
        </span>
      </figcaption>
    </figure>
  );
}
