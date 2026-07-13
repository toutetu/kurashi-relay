import { CalendarDays, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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

function DashboardPanel({
  tab,
  activeTab,
  children,
}: {
  tab: DashboardTab;
  activeTab: DashboardTab;
  children: ReactNode;
}) {
  return (
    <div
      id={`dashboard-panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`dashboard-tab-${tab}`}
      className={`${activeTab === tab ? "block" : "hidden"} xl:block`}
    >
      {children}
    </div>
  );
}

function HomeDashboard({ data }: { data: DashboardData }) {
  const [currentActivity, setCurrentActivity] = useState<LocalActivity | null>(
    data.currentActivity ? createLocalActivity(data.currentActivity) : null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab = getDashboardTab(rawTab);

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
      <SegmentedTabs
        tabs={dashboardTabs}
        value={activeTab}
        onChange={selectTab}
        label="ホームの表示内容"
      />
      <div className="space-y-3">
        <DashboardPanel tab="record" activeTab={activeTab}>
          <div
            data-testid="home-record-row"
            className="grid min-w-0 gap-3 xl:grid-cols-3 xl:items-stretch"
          >
            <div className="flex min-w-0">
              <QuickStartCard onStart={setCurrentActivity} />
            </div>
            <div className="flex min-w-0">
              <QuickLogsCard initialLogs={data.quickLogs} />
            </div>
            <div className="flex min-w-0">
              <CurrentActivityCard
                activity={currentActivity}
                onChange={setCurrentActivity}
              />
            </div>
          </div>
        </DashboardPanel>
        <DashboardPanel tab="today" activeTab={activeTab}>
          <div
            data-testid="home-today-row"
            className="grid min-w-0 gap-3 xl:grid-cols-3 xl:items-stretch"
          >
            <div className="flex min-w-0">
              <NextPlansCard plans={data.nextPlans} />
            </div>
            <div className="flex min-w-0">
              <MotherConditionsCard initialCondition={data.conditions.mother} />
            </div>
            <div className="flex min-w-0">
              <TimeBalanceCard balance={data.timeBalance} />
            </div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

export function HomePage() {
  const today = getTokyoToday();
  const query = useDashboardQuery(today);

  return (
    <div className="mx-auto max-w-[1420px]">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between xl:mb-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
            <Sparkles aria-hidden="true" size={17} />
            今日のくらしを、見えるかたちに
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
            ホーム
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[var(--muted-text)]">
            <CalendarDays aria-hidden="true" size={17} />
            {query.data ? formatDate(query.data.date) : formatDate(today)}
          </p>
        </div>
        <Button
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          variant="outline"
          tone="blue"
          icon={RefreshCcw}
          loading={query.isFetching && !query.isPending}
          className="self-start sm:self-auto"
        >
          {query.isFetching && !query.isPending
            ? "更新中…"
            : "最新の情報に更新"}
        </Button>
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
