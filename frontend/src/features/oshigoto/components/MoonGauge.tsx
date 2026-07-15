import { STAMP_SIZE } from "../data";

type MoonGaugeProps = {
  count: number;
  size?: number;
};

export function MoonGauge({ count, size = 104 }: MoonGaugeProps) {
  const scale = size / 104;
  const viewW = 130;
  const viewH = 150;
  const cx = 65;
  const cy = 82;
  const R = 50;

  const f = Math.min(1, Math.max(0, count / STAMP_SIZE));
  const rx = R * Math.abs(Math.cos(Math.PI * f));
  const sweep = f < 0.5 ? 0 : 1;

  const litPath =
    f <= 0
      ? null
      : f >= 1
        ? null
        : `M${cx},${cy - R} A${R},${R} 0 0 1 ${cx},${cy + R} A${rx},${R} 0 0 ${sweep} ${cx},${cy - R} Z`;

  return (
    <svg
      width={size}
      height={Math.round(viewH * scale)}
      viewBox={`0 0 ${viewW} ${viewH}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx={cx}
        cy={cy}
        r={R + 8}
        fill="var(--osh-moon-lit)"
        opacity={0.14}
      />
      <circle cx={cx} cy={cy} r={R} fill="var(--osh-moon-dark)" />
      {f > 0 && (
        <g transform={`rotate(35 ${cx} ${cy})`}>
          {f >= 1 ? (
            <circle cx={cx} cy={cy} r={R} fill="var(--osh-moon-lit)" />
          ) : litPath ? (
            <path d={litPath} fill="var(--osh-moon-lit)" />
          ) : null}
        </g>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="var(--osh-line2)"
        strokeWidth={2.5}
      />
    </svg>
  );
}
