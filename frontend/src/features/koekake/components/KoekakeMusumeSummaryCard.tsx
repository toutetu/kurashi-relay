import type { MusumeSummary } from "../../musume/api/schemas/musumeSchema";
import {
  formatSchoolStartPeriod,
  formatSummaryItemLine,
  formatWakeUpTime,
  isBeforeTokyoHour,
  isSummerMode,
} from "../../musume/utils";

type KoekakeMusumeSummaryCardProps = {
  summary: MusumeSummary | null;
  isLoading: boolean;
};

export function KoekakeMusumeSummaryCard({
  summary,
  isLoading,
}: KoekakeMusumeSummaryCardProps) {
  const useTodayLabels =
    summary !== null &&
    isSummerMode(summary.mode) &&
    isBeforeTokyoHour(15);

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
          <p>
            {formatSummaryItemLine(
              useTodayLabels ? "今日は なにする?" : "いまから何する?",
              summary.today_tasks,
              summary.decided_with.today,
            )}
          </p>
          {useTodayLabels ? (
            <>
              <p>
                {formatSummaryItemLine(
                  "今日 何がいる?",
                  summary.today_items,
                  summary.decided_with.today_item,
                )}
              </p>
              <p>
                {formatSummaryItemLine(
                  "今日 何時に寝る?",
                  summary.bedtime ? [summary.bedtime] : [],
                  summary.decided_with.bedtime,
                )}
              </p>
            </>
          ) : (
            <>
              {isSummerMode(summary.mode) && (
                <p>
                  {formatSummaryItemLine(
                    "明日 なにする?",
                    summary.tomorrow_plans,
                    summary.decided_with.tomorrow_plan,
                  )}
                </p>
              )}
              <p>
                {formatSummaryItemLine(
                  "明日 何がいる?",
                  summary.tomorrow_items,
                  summary.decided_with.tomorrow_item,
                )}
              </p>
              <p>
                {isSummerMode(summary.mode)
                  ? formatSummaryItemLine(
                      "明日 何時に起きる?",
                      summary.wake_up_time
                        ? [formatWakeUpTime(summary.wake_up_time)]
                        : [],
                      summary.decided_with.start,
                    )
                  : formatSummaryItemLine(
                      "何時間目から登校?",
                      summary.school_start_period
                        ? [formatSchoolStartPeriod(summary.school_start_period)]
                        : [],
                      summary.decided_with.start,
                    )}
              </p>
            </>
          )}
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
