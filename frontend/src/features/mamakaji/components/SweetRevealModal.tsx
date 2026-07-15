import { Button } from "../../../components/ui/Button";
import {
  POINT_PER_STAMP,
  remainingKajiForTicket,
  STAMP_SIZE,
  type Sweet,
} from "../data";

type SweetRevealModalProps = {
  sweet: Sweet;
  carryover: number;
  points: number;
  onClose: () => void;
};

export function SweetRevealModal({
  sweet,
  carryover,
  points,
  onClose,
}: SweetRevealModalProps) {
  const ticketRemaining = remainingKajiForTicket(points + POINT_PER_STAMP);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--mkj-ink)]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sweet-reveal-title"
    >
      <div className="relative w-full max-w-sm rounded-[28px] border border-[var(--mkj-line2)] bg-[var(--mkj-card)] px-5 py-7 text-center shadow-[var(--mkj-shadow)]">
        <span
          className="mkj-twinkle absolute left-5 top-2 text-lg"
          aria-hidden="true"
        >
          🎀
        </span>
        <span
          className="mkj-twinkle absolute right-6 top-5 text-base [animation-delay:0.5s]"
          aria-hidden="true"
        >
          ✨
        </span>
        <span
          className="mkj-twinkle absolute bottom-24 left-4 text-sm [animation-delay:0.9s]"
          aria-hidden="true"
        >
          ⭐
        </span>
        <span
          className="mkj-twinkle absolute bottom-20 right-5 text-sm [animation-delay:0.3s]"
          aria-hidden="true"
        >
          🎀
        </span>

        <p
          id="sweet-reveal-title"
          className="text-[15px] font-extrabold text-[var(--mkj-ink)]"
        >
          家事 <span className="text-[var(--mkj-rasp)]">{STAMP_SIZE}個</span>
          、おつかれさま！
        </p>

        <div className="relative mx-auto my-4 size-[140px]">
          <span
            className="pointer-events-none absolute inset-[-7px] rounded-full border-2 border-dashed border-[var(--mkj-caramel)] opacity-50"
            aria-hidden="true"
          />
          <div className="grid size-full place-items-center rounded-full border-2 border-[var(--mkj-line2)] bg-[radial-gradient(circle_at_50%_40%,var(--mkj-caramel-soft),var(--mkj-rasp-soft))] text-[60px]">
            <span aria-hidden="true">{sweet.emoji}</span>
          </div>
        </div>

        <p className="text-lg font-extrabold text-[var(--mkj-rasp-deep)]">
          {sweet.name} ゲット！{sweet.flag}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-caramel-soft)] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[var(--mkj-caramel-ink)]">
          🎫 {POINT_PER_STAMP}ポイント たまった
        </p>
        <p className="mt-3 text-[12.5px] text-[var(--mkj-ink-soft)]">
          「作る券」まで{" "}
          <b className="font-extrabold text-[var(--mkj-rasp)]">
            あと{ticketRemaining}個
          </b>
          {carryover > 0 && <>（{carryover}個は 繰り越し）</>}
        </p>

        <Button tone="neutral" className="mt-5 w-full" onClick={onClose}>
          とじる
        </Button>
      </div>
    </div>
  );
}
