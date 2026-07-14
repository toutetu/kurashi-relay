import { CalendarDays, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SegmentedTabs } from "../components/ui/SegmentedTabs";
import { Button } from "../components/ui/Button";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import {
  CurrentActivityCard,
  MotherConditionsCard,
  NextPlansCard,
  QuickLogsCard,
  QuickStartCard,
  TimeBalanceCard,
} from "../features/dashboard/components/DashboardCards";
import { useDashboardQuery } from "../features/dashboard/queries/useDashboardQuery";
import { MoodPicker } from "../features/mood/mood";
import type { DashboardData } from "../types/dashboard";
import { createLocalActivity, type LocalActivity } from "../types/local";
import { formatDate, getTokyoToday } from "../utils/date";

const dashboardTabs = [
  { value: "record", label: "記録" },
  { value: "today", label: "今日" },
] as const;

type DashboardTab = (typeof dashboardTabs)[number]["value"];

function getDashboardTab(value: string | null): DashboardTab {
  return dashboardTabs.some((tab) => tab.value === value)
    ? (value as DashboardTab)
    : "record";
}

function HomeDashboard({ data }: { data: DashboardData }) {
  const [currentActivity, setCurrentActivity] = useState<LocalActivity | null>(
    data.currentActivity ? createLocalActivity(data.currentActivity) : null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab = getDashboardTab(rawTab);
  const runningCategory =
    currentActivity?.status === "running" ? currentActivity.category : null;

  useEffect(() => {
    if (rawTab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, rawTab, searchParams, setSearchParams]);

  const selectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  return (
    <div>
      <CurrentActivityCard
        activity={currentActivity}
        onChange={setCurrentActivity}
      />
      <SegmentedTabs
        tabs={dashboardTabs}
        value={activeTab}
        onChange={selectTab}
        panelId="dashboard-panel"
        label="ホームの表示内容"
      />
      <div
        id="dashboard-panel"
        role="tabpanel"
        aria-labelledby={`dashboard-tab-${activeTab}`}
        data-testid="home-dashboard-grid"
        className="home-grid min-w-0"
      >
        <p className="zone-label area-z1 hidden xl:flex">✏️ きろくする</p>
        <p className="zone-label area-z2 hidden xl:flex">👀 きょうのようす</p>
        <div
          className={`area-qs ${activeTab === "record" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <QuickStartCard
            onStart={setCurrentActivity}
            runningCategory={runningCategory}
          />
        </div>
        <div
          className={`area-ql ${activeTab === "record" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <QuickLogsCard initialLogs={data.quickLogs} />
        </div>
        <div
          className={`area-cd ${activeTab === "record" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <MotherConditionsCard initialCondition={data.conditions.mother} />
        </div>
        <div
          className={`area-pl ${activeTab === "today" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <NextPlansCard plans={data.nextPlans} />
        </div>
        <div
          className={`area-tb ${activeTab === "today" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <TimeBalanceCard balance={data.timeBalance} />
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const today = getTokyoToday();
  const query = useDashboardQuery(today);

  return (
    <div className="mx-auto max-w-[1420px]">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between xl:mb-1.5">
        <div>
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--muted)]">
            <CalendarDays aria-hidden="true" size={14} />
            {query.data ? formatDate(query.data.date) : formatDate(today)}
          </p>
          <h1 className="mt-0.5 text-[18px] font-extrabold tracking-tight text-[var(--ink)]">
            今日のくらしを、見えるかたちに
          </h1>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <MoodPicker />
          <Button
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            variant="ghost"
            tone="blue"
            size="compact"
            icon={RefreshCcw}
            loading={query.isFetching && !query.isPending}
          >
            {query.isFetching && !query.isPending
              ? "更新中…"
              : "最新の情報に更新"}
          </Button>
        </div>
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
