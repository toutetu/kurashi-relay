import { STAMP_SIZE } from "../data";
import { JarGauge } from "./JarGauge";

type KajiProgressHeroProps = {
  count: number;
  dropTick?: number;
};

export function KajiProgressHero({ count, dropTick }: KajiProgressHeroProps) {
  const remaining = Math.max(0, STAMP_SIZE - count);

  return (
    <div className="flex items-center gap-2.5 rounded-[22px] border border-[var(--mkj-line)] bg-[var(--mkj-card2)] px-4 py-3.5">
      <JarGauge count={count} dropTick={dropTick} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--mkj-ink-soft)]">世界のおやつまで</p>
        <p className="text-[33px] font-extrabold leading-tight text-[var(--mkj-rasp)]">
          あと{remaining}
          <span className="ml-0.5 text-sm font-bold text-[var(--mkj-ink-faint)]">
            個
          </span>
        </p>
        <p className="text-xs font-bold text-[var(--mkj-ink-faint)]">
          びんの中身 {count} / {STAMP_SIZE}個
        </p>
        <p className="mt-1.5 text-[11.5px] font-extrabold text-[var(--mkj-rasp)]">
          🍰 あと{remaining}個で おやつスタンプ！
        </p>
      </div>
    </div>
  );
}
