import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { useState } from "react";
import {
  completeHomeEvent,
  createHomeEvent,
  skipHomePlan,
} from "../api/home";
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
import {
  dashboardTabs,
  type DashboardTab,
} from "../features/dashboard/hooks/dashboardTab";
import { useSpaDashboardTab } from "../features/dashboard/hooks/useSpaDashboardTab";
import { useDashboardQuery } from "../features/dashboard/queries/useDashboardQuery";
import { MoodPicker } from "../features/mood/mood";
import type {
  DashboardData,
  QuickActivityOption,
  SchedulePlan,
} from "../types/dashboard";
import { createLocalActivity, type LocalActivity } from "../types/local";
import { formatDate, getTokyoToday } from "../utils/date";

/** ホーム再掲用。true にすると表示する */
const SHOW_HOME_MOTHER_CONDITIONS = false;
const SHOW_HOME_TIME_BALANCE = false;

function HomeDashboard({
  data,
  activeTab,
  selectTab,
}: {
  data: DashboardData;
  activeTab: DashboardTab;
  selectTab: (tab: DashboardTab) => void;
}) {
  const queryClient = useQueryClient();
  const [currentActivity, setCurrentActivity] = useState<LocalActivity | null>(
    data.currentActivity ? createLocalActivity(data.currentActivity) : null,
  );
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const runningOptionId =
    currentActivity && currentActivity.status !== "completed"
      ? currentActivity.plannedActivityId
        ? `plan:${currentActivity.plannedActivityId}`
        : (data.quickActivities.find(
            (option) =>
              option.source === "preset" &&
              option.activityDefinitionId ===
                currentActivity.activityDefinitionId,
          )?.id ?? null)
      : null;
  const runningPlanId =
    currentActivity &&
    currentActivity.status !== "completed" &&
    currentActivity.plannedActivityId
      ? String(currentActivity.plannedActivityId)
      : null;

  const refreshSavedActivityData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["schedule-comparisons"] }),
    ]);
  };

  const completeRunningIfNeeded = async (at: string) => {
    if (!currentActivity || currentActivity.status === "completed") return;
    await completeHomeEvent(currentActivity.eventId, at);
    setCurrentActivity({
      ...currentActivity,
      status: "completed",
      completedAt: at,
      pausedAt: null,
    });
  };

  const startActivity = async (option: QuickActivityOption) => {
    const startedAt = new Date().toISOString();
    await completeRunningIfNeeded(startedAt);

    const event = await createHomeEvent({
      activity_definition_id: option.activityDefinitionId,
      ...(option.plannedActivityId
        ? { planned_activity_id: option.plannedActivityId }
        : {}),
      occurred_at: startedAt,
      idempotency_key: `quick-activity:${crypto.randomUUID()}`,
    });

    setCurrentActivity({
      id: String(event.id),
      eventId: event.id,
      activityDefinitionId: option.activityDefinitionId,
      plannedActivityId: option.plannedActivityId,
      title: option.label,
      category: option.category,
      startedAt: event.occurred_at ?? startedAt,
      status: "running",
      relatedPlanTitle: option.source === "google" ? option.label : null,
      pausedAt: null,
      completedAt: null,
      totalPausedMilliseconds: 0,
    });

    await refreshSavedActivityData();
  };

  const completeActivity = async (
    activity: LocalActivity,
    endedAt: string,
  ) => {
    await completeHomeEvent(activity.eventId, endedAt);
    await refreshSavedActivityData();
  };

  const runPlanAction = async (
    plan: SchedulePlan,
    action: () => Promise<void>,
  ) => {
    if (busyPlanId !== null) return;
    setBusyPlanId(plan.id);
    setPlanError(null);
    try {
      await action();
    } catch (error) {
      setPlanError(
        error instanceof Error
          ? error.message
          : "予定の操作に失敗しました。もう一度お試しください。",
      );
    } finally {
      setBusyPlanId(null);
    }
  };

  const startPlan = (plan: SchedulePlan) =>
    runPlanAction(plan, async () => {
      const startedAt = new Date().toISOString();
      await completeRunningIfNeeded(startedAt);
      const event = await createHomeEvent({
        planned_activity_id: Number(plan.id),
        occurred_at: startedAt,
        idempotency_key: `plan-start:${plan.id}:${crypto.randomUUID()}`,
      });
      setCurrentActivity({
        id: String(event.id),
        eventId: event.id,
        activityDefinitionId: event.activity_definition_id,
        plannedActivityId: Number(plan.id),
        title: plan.title,
        category: plan.category,
        startedAt: event.occurred_at ?? startedAt,
        status: "running",
        relatedPlanTitle: plan.title,
        pausedAt: null,
        completedAt: null,
        totalPausedMilliseconds: 0,
      });
      await refreshSavedActivityData();
    });

  const completePlanAsPlanned = (plan: SchedulePlan) =>
    runPlanAction(plan, async () => {
      await completeRunningIfNeeded(new Date().toISOString());
      await createHomeEvent({
        planned_activity_id: Number(plan.id),
        occurred_at: plan.startAt,
        ended_at: plan.endAt,
        idempotency_key: `plan-done:${plan.id}:${crypto.randomUUID()}`,
      });
      await refreshSavedActivityData();
    });

  const skipPlan = (plan: SchedulePlan) =>
    runPlanAction(plan, async () => {
      const planId = Number(plan.id);
      if (
        currentActivity &&
        currentActivity.status !== "completed" &&
        currentActivity.plannedActivityId === planId
      ) {
        await completeHomeEvent(
          currentActivity.eventId,
          new Date().toISOString(),
        );
        setCurrentActivity({
          ...currentActivity,
          status: "completed",
          completedAt: new Date().toISOString(),
          pausedAt: null,
        });
      }
      await skipHomePlan(planId);
      await refreshSavedActivityData();
    });

  const savePlanDetail = (
    plan: SchedulePlan,
    startAt: string,
    endAt: string,
  ) =>
    runPlanAction(plan, async () => {
      await completeRunningIfNeeded(new Date().toISOString());
      await createHomeEvent({
        planned_activity_id: Number(plan.id),
        occurred_at: startAt,
        ended_at: endAt,
        idempotency_key: `plan-detail:${plan.id}:${crypto.randomUUID()}`,
      });
      await refreshSavedActivityData();
    });

  return (
    <div>
      <CurrentActivityCard
        activity={currentActivity}
        onChange={setCurrentActivity}
        onComplete={completeActivity}
      />
      <SegmentedTabs
        tabs={dashboardTabs}
        value={activeTab}
        onChange={(tab) => selectTab(tab as DashboardTab)}
        panelId="dashboard-panel"
        label="ホームの表示内容"
      />
      <div
        id="dashboard-panel"
        role="tabpanel"
        aria-labelledby={`dashboard-tab-${activeTab}`}
        data-testid="home-dashboard-grid"
        className={`home-grid min-w-0${
          SHOW_HOME_MOTHER_CONDITIONS || SHOW_HOME_TIME_BALANCE
            ? " home-grid--extras"
            : ""
        }`}
      >
        <p className="zone-label area-z2 hidden xl:flex">👀 きょうのようす</p>
        <p className="zone-label area-z1 hidden xl:flex">✏️ きろくする</p>
        <div
          className={`area-pl ${activeTab === "today" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <NextPlansCard
            plans={data.nextPlans}
            date={data.date}
            runningPlanId={runningPlanId}
            busyPlanId={busyPlanId}
            errorMessage={planError}
            actions={{
              onStart: startPlan,
              onCompleteAsPlanned: completePlanAsPlanned,
              onSkip: skipPlan,
              onSaveDetail: savePlanDetail,
            }}
          />
        </div>
        <div
          className={`area-qs ${activeTab === "record" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <QuickStartCard
            activities={data.quickActivities}
            onStart={startActivity}
            runningOptionId={runningOptionId}
          />
        </div>
        <div
          className={`area-ql ${activeTab === "record" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
        >
          <QuickLogsCard initialLogs={data.quickLogs} />
        </div>
        {SHOW_HOME_MOTHER_CONDITIONS && (
          <div
            className={`area-cd ${activeTab === "record" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
          >
            <MotherConditionsCard initialCondition={data.conditions.mother} />
          </div>
        )}
        {SHOW_HOME_TIME_BALANCE && (
          <div
            className={`area-tb ${activeTab === "today" ? "flex" : "hidden"} h-full w-full min-w-0 justify-self-stretch xl:flex`}
          >
            <TimeBalanceCard balance={data.timeBalance} />
          </div>
        )}
      </div>
    </div>
  );
}

function HomeDashboardWithTab({ data }: { data: DashboardData }) {
  const [activeTab, selectTab] = useSpaDashboardTab();

  return (
    <HomeDashboard
      data={data}
      activeTab={activeTab}
      selectTab={selectTab}
    />
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
        <HomeDashboardWithTab key={query.data.date} data={query.data} />
      )}
    </div>
  );
}
