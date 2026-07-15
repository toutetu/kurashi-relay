import { useId } from "react";
import { STAMP_SIZE } from "../data";

const CANDY_POSITIONS = [
  { cx: 45, cy: 94, r: 9 },
  { cx: 70, cy: 102, r: 8 },
  { cx: 92, cy: 93, r: 9 },
  { cx: 54, cy: 116, r: 8 },
  { cx: 82, cy: 118, r: 9 },
  { cx: 36, cy: 116, r: 7 },
  { cx: 66, cy: 132, r: 8 },
  { cx: 48, cy: 108, r: 7 },
  { cx: 78, cy: 108, r: 8 },
  { cx: 60, cy: 124, r: 9 },
] as const;

const CANDY_COLORS = [
  "var(--mkj-rasp)",
  "var(--mkj-caramel)",
  "var(--mkj-sage)",
  "var(--mkj-plum)",
] as const;

type JarGaugeProps = {
  count: number;
  size?: number;
  /** 完了操作のたびに増える値。変わるとふたが開いてキャンディが落ちる */
  dropTick?: number;
};

export function JarGauge({ count, size = 106, dropTick = 0 }: JarGaugeProps) {
  const clipId = useId();
  const visibleCount = Math.min(Math.max(0, count), STAMP_SIZE);
  const scale = size / 106;
  const viewW = 130;
  const viewH = 150;
  const dropping = dropTick > 0;

  return (
    <svg
      width={size}
      height={Math.round(viewH * scale)}
      viewBox={`0 0 ${viewW} ${viewH}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M28 42h74a6 6 0 0 1 6 6v80a14 14 0 0 1-14 14H36a14 14 0 0 1-14-14V48a6 6 0 0 1 6-6z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="16"
          y="78"
          width="98"
          height="78"
          fill="var(--mkj-caramel-soft)"
        />
        {CANDY_POSITIONS.slice(0, visibleCount).map((pos, index) => {
          const isNewest = dropping && index === visibleCount - 1;
          return (
            <circle
              key={
                isNewest
                  ? `drop-${dropTick}`
                  : `${pos.cx}-${pos.cy}`
              }
              cx={pos.cx}
              cy={pos.cy}
              r={pos.r}
              fill={CANDY_COLORS[index % CANDY_COLORS.length]}
              className={isNewest ? "mkj-candy-fall-anim" : undefined}
              style={
                isNewest
                  ? { ["--mkj-fall-from" as string]: `${28 - pos.cy}px` }
                  : undefined
              }
            />
          );
        })}
      </g>
      <path
        d="M28 42h74a6 6 0 0 1 6 6v80a14 14 0 0 1-14 14H36a14 14 0 0 1-14-14V48a6 6 0 0 1 6-6z"
        fill="none"
        stroke="var(--mkj-line2)"
        strokeWidth="2.5"
      />
      <path
        d="M34 50v78"
        stroke="#fff"
        strokeWidth="3"
        opacity="0.5"
        strokeLinecap="round"
      />
      <g
        key={`lid-${dropTick}`}
        className={dropping ? "mkj-lid-anim" : undefined}
      >
        <rect
          x="24"
          y="24"
          width="82"
          height="16"
          rx="8"
          fill="var(--mkj-rasp)"
        />
        <rect
          x="55"
          y="14"
          width="20"
          height="12"
          rx="6"
          fill="var(--mkj-rasp)"
        />
      </g>
      <g transform="translate(65,44)">
        <path
          d="M0 0-15-6Q-20-7-19-2L-18 5Q-19 10-13 9Z"
          fill="var(--mkj-caramel)"
        />
        <path
          d="M0 0 15-6Q20-7 19-2L18 5Q19 10 13 9Z"
          fill="var(--mkj-caramel)"
        />
        <circle r="4.2" fill="var(--mkj-caramel-soft)" />
      </g>
    </svg>
  );
}
