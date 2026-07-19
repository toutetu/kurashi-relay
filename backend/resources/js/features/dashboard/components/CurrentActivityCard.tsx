import {
  ArrowRightLeft,
  CirclePause,
  CirclePlay,
  CircleStop,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { StatusChip } from "../../../components/ui/DashboardPrimitives";
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
  const headingId = useId();
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
    <section
      aria-labelledby={headingId}
      className="mb-2.5 flex flex-wrap items-center gap-2.5 rounded-3xl border-[1.5px] bg-[var(--surface)] px-3 py-1.5 shadow-[var(--card-shadow)] sm:rounded-full sm:px-4 sm:py-1.5"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 28%, var(--line))",
      }}
    >
      <h2 id={headingId} className="sr-only">
        現在の活動
      </h2>
      {activity ? (
        <>
          {activity.status === "running" && (
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 animate-pulse rounded-full bg-[var(--green)]"
            />
          )}
          <p className="min-w-0 truncate text-[15px] font-extrabold text-[var(--ink)]">
            {activity.title}
          </p>
          <StatusChip tone={activity.status === "paused" ? "yellow" : "red"}>
            {statusLabels[activity.status]}
          </StatusChip>
          <p className="text-xs text-[var(--muted)] tabular-nums">
            開始 {formatTime(activity.startedAt)} ・ 関連予定{" "}
            {activity.relatedPlanTitle || "なし"}
          </p>
          <span className="hidden flex-1 sm:block" />
          <p className="text-xs font-bold text-[var(--muted)]">
            経過{" "}
            <strong className="ml-1 text-[19px] font-extrabold tabular-nums text-[var(--ink)]">
              {formatMinutes(elapsedMinutes)}
            </strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {activity.status === "running" && (
              <Button
                onClick={pause}
                variant="soft"
                tone="blue"
                size="compact"
                icon={CirclePause}
              >
                一時停止
              </Button>
            )}
            {activity.status === "paused" && (
              <Button
                onClick={resume}
                variant="soft"
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
                tone="blue"
                size="compact"
                icon={CircleStop}
              >
                終了
              </Button>
            )}
            <Button
              onClick={goToQuickStart}
              variant="ghost"
              tone="neutral"
              size="compact"
              icon={ArrowRightLeft}
            >
              切り替える
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            現在、進行中の活動はありません。
          </p>
          <span className="hidden flex-1 sm:block" />
          <Button
            onClick={goToQuickStart}
            variant="solid"
            tone="blue"
            size="compact"
            icon={CirclePlay}
          >
            活動を始める
          </Button>
        </>
      )}
    </section>
  );
}
