import { CalendarDays, RefreshCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import {
  ActionItemsCard,
  ChildStrategyCard,
  ConditionsCard,
  CurrentActivityCard,
  ImpactSummaryCard,
  LastWarCard,
  NextPlansCard,
  QuickLogsCard,
  QuickStartCard,
  TimeBalanceCard,
} from "../features/dashboard/components/DashboardCards";
import { useDashboardQuery } from "../features/dashboard/queries/useDashboardQuery";
import type { DashboardData } from "../types/dashboard";
import { createLocalActivity, type LocalActivity } from "../types/local";
import { formatDate, getTokyoToday } from "../utils/date";

function HomeDashboard({ data }: { data: DashboardData }) {
  const [currentActivity, setCurrentActivity] = useState<LocalActivity | null>(
    data.currentActivity ? createLocalActivity(data.currentActivity) : null,
  );

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <CurrentActivityCard
        activity={currentActivity}
        onChange={setCurrentActivity}
      />
      <QuickStartCard onStart={setCurrentActivity} />
      <QuickLogsCard initialLogs={data.quickLogs} />
      <NextPlansCard plans={data.nextPlans} />
      <ConditionsCard initialConditions={data.conditions} />
      <ChildStrategyCard strategy={data.childStrategy} />
      <TimeBalanceCard balance={data.timeBalance} />
      <ImpactSummaryCard impact={data.scheduleImpactSummary} />
      <ActionItemsCard items={data.actionItems} />
      <LastWarCard progress={data.lastWar} />
    </div>
  );
}

export function HomePage() {
  const today = getTokyoToday();
  const query = useDashboardQuery(today);

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#236da8]">
            <Sparkles aria-hidden="true" size={17} />
            今日のくらしを、見えるかたちに
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#28334a] sm:text-3xl">
            ホーム
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#667085]">
            <CalendarDays aria-hidden="true" size={17} />
            {query.data ? formatDate(query.data.date) : formatDate(today)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#bcdcf7] bg-white px-4 py-2.5 text-sm font-bold text-[#236da8] shadow-sm transition hover:bg-[#edf6ff] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] disabled:cursor-wait disabled:opacity-65 sm:self-auto"
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
        <HomeDashboard key={query.data.date} data={query.data} />
      )}
    </div>
  );
}
