import { getTokyoToday } from "../../../utils/date";
import { pickDailyKajiChallenge, type KajiChallenge } from "../data";

type KajiChallengeCardProps = {
  tasks: ReadonlyArray<KajiChallenge>;
};

export function KajiChallengeCard({ tasks }: KajiChallengeCardProps) {
  const challenge = pickDailyKajiChallenge(tasks, getTokyoToday());
  if (!challenge) return null;

  return (
    <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[var(--mkj-line2)] px-3 py-2.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-[var(--mkj-caramel-soft)] text-[17px]"
        aria-hidden="true"
      >
        {challenge.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-[11px] font-extrabold tracking-wide text-[var(--mkj-caramel-ink)]">
          今日の +1チャレンジ
        </b>
        <span className="block text-[13px] font-bold text-[var(--mkj-ink)]">
          {challenge.label}
        </span>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs font-extrabold text-[var(--mkj-caramel-ink)]">
        できたら ✨
      </span>
    </div>
  );
}
