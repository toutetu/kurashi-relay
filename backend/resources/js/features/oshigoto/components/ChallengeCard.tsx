import { CHALLENGE } from "../data";

export function ChallengeCard() {
  return (
    <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[var(--osh-line2)] px-3 py-2.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-[var(--osh-rose-soft)] text-[17px]"
        aria-hidden="true"
      >
        {CHALLENGE.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-[11px] font-extrabold tracking-wide text-[var(--osh-rose)]">
          今夜の ちょっとチャレンジ
        </b>
        <span className="block text-[13px] font-bold text-[var(--osh-ink)]">
          {CHALLENGE.label}
        </span>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs font-extrabold text-[var(--osh-rose)]">
        できたら ✨
      </span>
    </div>
  );
}
