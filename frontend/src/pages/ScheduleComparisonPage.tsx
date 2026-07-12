import { CalendarDays, RefreshCcw } from "lucide-react";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import { useDashboardQuery } from "../features/dashboard/queries/useDashboardQuery";
import { ScheduleComparisonList } from "../features/schedule/components/ScheduleComparisonList";
import { formatDate, formatMinutes, getTokyoToday } from "../utils/date";

export function ScheduleComparisonPage() {
  const today = getTokyoToday();
  const query = useDashboardQuery(today);

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#236da8]">
            <CalendarDays aria-hidden="true" size={17} />
            {query.data ? formatDate(query.data.date) : formatDate(today)}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#28334a] sm:text-3xl">
            今日の予定と実績
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#667085]">
            予定と実績の違いを、支援・待機・回復の時間と一緒に確認できます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#bcdcf7] bg-white px-4 py-2.5 text-sm font-bold text-[#236da8] shadow-sm hover:bg-[#edf6ff] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] disabled:cursor-wait disabled:opacity-65 sm:self-auto"
        >
          <RefreshCcw
            className={query.isFetching ? "animate-spin" : ""}
            aria-hidden="true"
            size={17}
          />
          {query.isFetching && !query.isPending
            ? "更新中…"
            : "最新の情報に更新"}
        </button>
      </div>

      {query.isPending && <DashboardLoading />}
      {query.isError && (
        <DashboardError
          message={
            query.error instanceof Error
              ? query.error.message
              : "通信状態を確認して、もう一度お試しください。"
          }
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      )}
      {query.isSuccess && (
        <>
          <section
            aria-label="予定への影響の概要"
            className="mb-5 grid grid-cols-2 gap-2 rounded-[1.4rem] border border-[#dce5ef] bg-white p-3 shadow-sm sm:grid-cols-4 sm:p-4"
          >
            <div className="rounded-xl bg-[#edf6ff] p-3 text-center">
              <span className="block text-xl font-black text-[#236da8]">
                {query.data.scheduleImpactSummary.onScheduleCount}
              </span>
              <span className="text-xs font-bold text-[#526078]">
                予定どおり
              </span>
            </div>
            <div className="rounded-xl bg-[#fff8db] p-3 text-center">
              <span className="block text-xl font-black text-[#8a6411]">
                {query.data.scheduleImpactSummary.delayedCount}
              </span>
              <span className="text-xs font-bold text-[#526078]">遅れ</span>
            </div>
            <div className="rounded-xl bg-[#fff0f1] p-3 text-center">
              <span className="block text-xl font-black text-[#b84047]">
                {query.data.scheduleImpactSummary.interruptedCount +
                  query.data.scheduleImpactSummary.cancelledCount}
              </span>
              <span className="text-xs font-bold text-[#526078]">
                中断・中止
              </span>
            </div>
            <div className="rounded-xl bg-[#eee8ff] p-3 text-center">
              <span className="block text-xl font-black text-[#684baa]">
                {formatMinutes(query.data.scheduleImpactSummary.lostMinutes)}
              </span>
              <span className="text-xs font-bold text-[#526078]">
                失われた時間
              </span>
            </div>
          </section>
          <ScheduleComparisonList items={query.data.scheduleComparisons} />
        </>
      )}
    </div>
  );
}
