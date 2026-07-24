import { Button } from "../../../components/ui/Button";
import type { Zombie } from "../data";
import { COIN_PER_FULL_MOON, STAMP_SIZE } from "../data";
import { MoonGauge } from "./MoonGauge";

type ZombieRevealModalProps = {
  zombie: Zombie;
  carryover?: number;
  onClose: () => void;
  title?: string;
  showCoin?: boolean;
  showCarryover?: boolean;
};

export function ZombieRevealModal({
  zombie,
  carryover = 0,
  onClose,
  title,
  showCoin = true,
  showCarryover = true,
}: ZombieRevealModalProps) {
  const nextRemaining = Math.max(0, STAMP_SIZE - carryover);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--osh-ink)]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zombie-reveal-title"
    >
      <div className="relative w-full max-w-sm rounded-[28px] border border-[var(--osh-line2)] bg-[var(--osh-card)] px-5 py-7 text-center shadow-[var(--osh-shadow)]">
        <span
          className="osh-twinkle absolute left-5 top-2 text-lg"
          aria-hidden="true"
        >
          🦇
        </span>
        <span
          className="osh-twinkle absolute right-6 top-5 text-base [animation-delay:0.5s]"
          aria-hidden="true"
        >
          ✨
        </span>
        <span
          className="osh-twinkle absolute bottom-24 left-4 text-sm [animation-delay:0.9s]"
          aria-hidden="true"
        >
          ⭐
        </span>

        <p
          id="zombie-reveal-title"
          className="text-[15px] font-extrabold text-[var(--osh-ink)]"
        >
          {title ?? (
            <>
              くらしのおしごと{" "}
              <span className="text-[var(--osh-violet)]">{STAMP_SIZE}個</span>
              ！満月だ！
            </>
          )}
        </p>

        <div className="relative mx-auto my-4 w-[150px]">
          <span
            className="pointer-events-none absolute inset-[-7px] rounded-full border-2 border-dashed border-[var(--osh-moon-dark)] opacity-55"
            aria-hidden="true"
          />
          <div className="grid place-items-center rounded-full border-2 border-[var(--osh-line2)] bg-[radial-gradient(circle_at_50%_40%,var(--osh-moon-lit),var(--osh-violet-soft))] py-2">
            <MoonGauge count={STAMP_SIZE} size={120} />
            <span className="-mt-2 text-[52px] leading-none" aria-hidden="true">
              {zombie.emoji}
            </span>
          </div>
        </div>

        <p className="text-lg font-extrabold text-[var(--osh-rose)]">
          {zombie.name} 登場！
        </p>
        {showCoin && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--osh-line2)] bg-[var(--osh-pump-soft)] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[var(--osh-pump-ink)]">
            🪙 {COIN_PER_FULL_MOON}円 たまったよ
          </p>
        )}
        {showCarryover && (
          <p className="mt-3 text-[12.5px] text-[var(--osh-ink-soft)]">
            つぎの満月まで{" "}
            <b className="font-extrabold text-[var(--osh-violet)]">
              あと{nextRemaining}個
            </b>
            {carryover > 0 && <>（{carryover}個は 繰り越し）</>}
          </p>
        )}

        <Button
          tone="default"
          className="mt-5 w-full"
          onClick={onClose}
        >
          つぎへ
        </Button>
      </div>
    </div>
  );
}
