import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { useState } from "react";
import {
  cancelHomeEvent,
  createHomeEvent,
  skipHomePlan,
  updateHomeEvent,
} from "../api/home";
import { getScheduleComparisons } from "../api/scheduleComparisons";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import { ScheduleComparisonList } from "../features/schedule/components/ScheduleComparisonList";
import type { ActualEntry, SchedulePlan } from "../types/dashboard";
import { formatDate, formatMinutes, getTokyoToday } from "../utils/date";

export function ScheduleComparisonPage() {
  const today = getTokyoToday();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today);
  const [busyActualId, setBusyActualId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["schedule-comparisons", date],
    queryFn: ({ signal }) => getScheduleComparisons(date, signal),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["schedule-comparisons"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const runActualAction = async (
    actual: ActualEntry,
    action: () => Promise<void>,
  ) => {
    if (busyActualId !== null) return;
    setBusyActualId(actual.id);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "実績の操作に失敗しました。もう一度お試しください。",
      );
    } finally {
      setBusyActualId(null);
    }
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
      await refresh();
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
      await createHomeEvent({
        planned_activity_id: Number(plan.id),
        occurred_at: new Date().toISOString(),
        idempotency_key: `plan-start:${plan.id}:${crypto.randomUUID()}`,
      });
    });

  const completePlanAsPlanned = (plan: SchedulePlan) =>
    runPlanAction(plan, async () => {
      await createHomeEvent({
        planned_activity_id: Number(plan.id),
        occurred_at: plan.startAt,
        ended_at: plan.endAt,
        idempotency_key: `plan-done:${plan.id}:${crypto.randomUUID()}`,
      });
    });

  const skipPlan = (plan: SchedulePlan) =>
    runPlanAction(plan, async () => {
      await skipHomePlan(Number(plan.id));
    });

  const savePlanDetail = (plan: SchedulePlan, startAt: string, endAt: string) =>
    runPlanAction(plan, async () => {
      await createHomeEvent({
        planned_activity_id: Number(plan.id),
        occurred_at: startAt,
        ended_at: endAt,
        idempotency_key: `plan-detail:${plan.id}:${crypto.randomUUID()}`,
      });
    });

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#236da8]">
            <CalendarDays aria-hidden="true" size={17} />
            {query.data ? formatDate(query.data.date) : formatDate(date)}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#28334a] sm:text-3xl">
            予定と実績
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#667085]">
            縦の時刻軸に沿って、予定・実績・差分を並べて見られます。ブロックのない帯が空白の時間です。
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#526078]">
            <span>日付</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setActionError(null);
                setPlanError(null);
              }}
              className="rounded-xl border border-[#dce5ef] bg-white px-3 py-2 font-bold text-[#28334a] shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3]"
            />
            {date !== today && (
              <button
                type="button"
                onClick={() => {
                  setDate(today);
                  setActionError(null);
                  setPlanError(null);
                }}
                className="rounded-xl border border-[#bcdcf7] bg-[#edf6ff] px-3 py-2 text-[#236da8] hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3]"
              >
                今日
              </button>
            )}
          </label>
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
                {query.data.summary.onScheduleCount}
              </span>
              <span className="text-xs font-bold text-[#526078]">
                予定どおり
              </span>
            </div>
            <div className="rounded-xl bg-[#fff8db] p-3 text-center">
              <span className="block text-xl font-black text-[#8a6411]">
                {query.data.summary.delayedCount}
              </span>
              <span className="text-xs font-bold text-[#526078]">遅れ</span>
            </div>
            <div className="rounded-xl bg-[#fff0f1] p-3 text-center">
              <span className="block text-xl font-black text-[#b84047]">
                {query.data.summary.interruptedCount +
                  query.data.summary.cancelledCount}
              </span>
              <span className="text-xs font-bold text-[#526078]">
                中断・中止
              </span>
            </div>
            <div className="rounded-xl bg-[#eee8ff] p-3 text-center">
              <span className="block text-xl font-black text-[#684baa]">
                {formatMinutes(query.data.summary.lostMinutes)}
              </span>
              <span className="text-xs font-bold text-[#526078]">
                失われた時間
              </span>
            </div>
          </section>
          {(actionError || planError) && (
            <p className="mb-3 text-sm font-bold text-[var(--coral)]" role="alert">
              {actionError ?? planError}
            </p>
          )}
          <ScheduleComparisonList
            items={query.data.comparisons}
            date={query.data.date}
            busyActualId={busyActualId}
            busyPlanId={busyPlanId}
            onDeleteActual={(actual) =>
              runActualAction(actual, async () => {
                await cancelHomeEvent(Number(actual.id));
              })
            }
            onUpdateActual={(actual, startAt, endAt) =>
              runActualAction(actual, async () => {
                await updateHomeEvent(Number(actual.id), {
                  occurred_at: startAt,
                  ended_at: endAt,
                });
              })
            }
            onStartPlan={startPlan}
            onCompletePlanAsPlanned={completePlanAsPlanned}
            onSkipPlan={skipPlan}
            onSavePlanDetail={savePlanDetail}
          />
        </>
      )}
    </div>
  );
}
