import { getMoonPhaseLabel, STAMP_SIZE } from "../data";
import { MoonGauge } from "./MoonGauge";

type ProgressHeroProps = {
  count: number;
};

export function ProgressHero({ count }: ProgressHeroProps) {
  const remaining = Math.max(0, STAMP_SIZE - count);
  const phase = getMoonPhaseLabel(count);

  return (
    <div className="flex items-center gap-2.5 rounded-[22px] border border-[var(--osh-line)] bg-[var(--osh-card2)] px-4 py-3.5">
      <MoonGauge count={count} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--osh-ink-soft)]">つぎのゾンビまで</p>
        <p className="text-[33px] font-extrabold leading-tight text-[var(--osh-violet)]">
          あと{remaining}
          <span className="ml-0.5 text-sm font-bold text-[var(--osh-ink-faint)]">
            個
          </span>
        </p>
        <p className="text-xs font-bold text-[var(--osh-ink-faint)]">
          {phase.emoji} {phase.name} {count} / {STAMP_SIZE}個
        </p>
        <p className="mt-1.5 text-[11.5px] font-extrabold text-[var(--osh-rose)]">
          🦇 満ちるほど ゾンビに近づく！
        </p>
      </div>
    </div>
  );
}
