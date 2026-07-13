import {
  Activity,
  ArrowRightLeft,
  CirclePause,
  CirclePlay,
  CircleStop,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import { Button } from "../../../components/ui/Button";
import {
  EmptyState,
  MetricTile,
  StatusChip,
} from "../../../components/ui/DashboardPrimitives";
import type { LocalActivity } from "../../../types/local";
import { formatMinutes, formatTime } from "../../../utils/date";

const statusLabels = {
  idle: "待機中",
  running: "進行中",
  paused: "一時停止中",
  completed: "終了",
} as const;

function calculateElapsedMinutes(activity: LocalActivity, currentTime: number) {
  const effectiveEnd = activity.completedAt
    ? new Date(activity.completedAt).getTime()
    : activity.pausedAt
      ? new Date(activity.pausedAt).getTime()
      : currentTime;
  return Math.max(
    0,
    Math.floor(
      (effectiveEnd -
        new Date(activity.startedAt).getTime() -
        activity.totalPausedMilliseconds) /
        60_000,
    ),
  );
}

function useElapsedMinutes(activity: LocalActivity | null) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const refresh = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    if (activity?.status !== "running") {
      return () => window.clearTimeout(refresh);
    }
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => {
      window.clearTimeout(refresh);
      window.clearInterval(timer);
    };
  }, [activity]);

  return activity ? calculateElapsedMinutes(activity, currentTime) : 0;
}

export function CurrentActivityCard({
  activity,
  onChange,
}: {
  activity: LocalActivity | null;
  onChange: (activity: LocalActivity | null) => void;
}) {
  const elapsedMinutes = useElapsedMinutes(activity);
  const goToQuickStart = () =>
    document
      .querySelector("#quick-start")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

  const pause = () => {
    if (!activity || activity.status !== "running") return;
    onChange({
      ...activity,
      status: "paused",
      pausedAt: new Date().toISOString(),
    });
  };
  const resume = () => {
    if (!activity || activity.status !== "paused") return;
    const pausedMilliseconds = activity.pausedAt
      ? Math.max(0, Date.now() - new Date(activity.pausedAt).getTime())
      : 0;
    onChange({
      ...activity,
      status: "running",
      pausedAt: null,
      completedAt: null,
      totalPausedMilliseconds:
        activity.totalPausedMilliseconds + pausedMilliseconds,
    });
  };
  const complete = () => {
    if (!activity || activity.status === "completed") return;
    const now = new Date();
    const pausedMilliseconds = activity.pausedAt
      ? Math.max(0, now.getTime() - new Date(activity.pausedAt).getTime())
      : 0;
    onChange({
      ...activity,
      status: "completed",
      pausedAt: null,
      completedAt: now.toISOString(),
      totalPausedMilliseconds:
        activity.totalPausedMilliseconds + pausedMilliseconds,
    });
  };

  return (
    <DashboardCard
      title="現在の活動"
      icon={Activity}
      tone="red"
      density="compact"
    >
      {activity ? (
        <div className="space-y-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-lg font-black text-[var(--text)]">
              {activity.title}
            </p>
            <StatusChip tone={activity.status === "paused" ? "yellow" : "red"}>
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${activity.status === "running" ? "animate-pulse bg-current" : "bg-current"}`}
              />
              {statusLabels[activity.status]}
            </StatusChip>
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <MetricTile label="開始" value={formatTime(activity.startedAt)} />
            <MetricTile label="経過" value={formatMinutes(elapsedMinutes)} />
            <MetricTile
              label="関連予定"
              value={activity.relatedPlanTitle || "なし"}
            />
          </dl>
          <div className="flex flex-wrap gap-2">
            {activity.status === "running" && (
              <Button
                onClick={pause}
                variant="outline"
                tone="red"
                size="compact"
                icon={CirclePause}
              >
                一時停止
              </Button>
            )}
            {activity.status === "paused" && (
              <Button
                onClick={resume}
                variant="outline"
                tone="blue"
                size="compact"
                icon={CirclePlay}
              >
                再開
              </Button>
            )}
            {activity.status !== "completed" && (
              <Button
                onClick={complete}
                variant="solid"
                tone="red"
                size="compact"
                icon={CircleStop}
              >
                終了
              </Button>
            )}
            <Button
              onClick={goToQuickStart}
              variant="outline"
              tone="neutral"
              size="compact"
              icon={ArrowRightLeft}
            >
              切り替える
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <EmptyState>現在、進行中の活動はありません。</EmptyState>
          <Button
            onClick={goToQuickStart}
            variant="solid"
            tone="red"
            size="compact"
            icon={CirclePlay}
          >
            活動を始める
          </Button>
        </div>
      )}
    </DashboardCard>
  );
}
