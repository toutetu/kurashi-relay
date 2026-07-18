import type { MusumeSummary } from "../../musume/api/schemas/musumeSchema";
import {
  WITH_MAMA_LABEL,
  formatSchoolStartPeriod,
  formatWakeUpTime,
  isSummerMode,
} from "../../musume/utils";

type KoekakeMusumeSummaryCardProps = {
  summary: MusumeSummary | null;
  isLoading: boolean;
};

function renderItemLine(
  label: string,
  titles: string[],
  state: MusumeSummary["today_state"],
): string {
  if (state === "with_mama") return `${label}: ${WITH_MAMA_LABEL}`;
  if (titles.length > 0) return `${label}: ${titles.join("・")}`;
  return `${label}: まだ決めてないよ`;
}

export function KoekakeMusumeSummaryCard({
  summary,
  isLoading,
}: KoekakeMusumeSummaryCardProps) {
  return (
    <section className="mb-5 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-[var(--mother-blue-strong)]">
        むすめの見通し
      </h2>

      {isLoading && (
        <p className="mt-3 text-sm text-[var(--muted-text)]">読み込み中…</p>
      )}

      {!isLoading && summary === null && (
        <p className="mt-3 text-sm text-[var(--muted-text)]">
          まだ決めてないよ
        </p>
      )}

      {!isLoading && summary && (
        <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
          <p>{renderItemLine("いまから何する?", summary.today_tasks, summary.today_state)}</p>
          <p>
            {renderItemLine(
              "明日 何がいる?",
              summary.tomorrow_items,
              summary.tomorrow_items_state,
            )}
          </p>
          <p>
            {isSummerMode(summary.mode)
              ? summary.start_state === "with_mama"
                ? `明日 何時に起きる?: ${WITH_MAMA_LABEL}`
                : summary.wake_up_time
                  ? `明日 何時に起きる?: ${formatWakeUpTime(summary.wake_up_time)}`
                  : "明日 何時に起きる?: まだ決めてないよ"
              : summary.start_state === "with_mama"
                ? `何時間目から登校?: ${WITH_MAMA_LABEL}`
                : summary.school_start_period
                  ? `何時間目から登校?: ${formatSchoolStartPeriod(summary.school_start_period)}`
                  : "何時間目から登校?: まだ決めてないよ"}
          </p>
          {summary.review_completed_at && (
            <span className="inline-flex rounded-full bg-[var(--mother-blue-soft)] px-3 py-1 text-xs font-bold text-[var(--mother-blue-strong)]">
              確認完了 🎀
            </span>
          )}
        </div>
      )}
    </section>
  );
}
