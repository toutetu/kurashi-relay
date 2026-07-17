import { Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { ChallengeCard } from "../features/oshigoto/components/ChallengeCard";
import { CheerOverlay } from "../features/oshigoto/components/CheerOverlay";
import { OshigotoPageShell } from "../features/oshigoto/components/OshigotoPageShell";
import { OshigotoTabs } from "../features/oshigoto/components/OshigotoTabs";
import { ProgressHero } from "../features/oshigoto/components/ProgressHero";
import { TaskRow } from "../features/oshigoto/components/TaskRow";
import { ZombieRevealModal } from "../features/oshigoto/components/ZombieRevealModal";
import {
  INITIAL_TASKS,
  STREAK_DAYS,
  ZOMBIES,
  type Task,
  type Zombie,
} from "../features/oshigoto/data";
import { useOshigotoTasks } from "../features/oshigoto/queries/useOshigotoTasks";
import "../features/oshigoto/oshigoto.css";

function ShizukuIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M22 8s-9 10-9 16a9 9 0 0 0 18 0c0-6-9-16-9-16z"
        fill="var(--osh-violet)"
      />
      <path
        d="M12 16s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"
        fill="var(--osh-rose)"
      />
      <circle cx="19" cy="20" r="2.1" fill="#fff" opacity="0.85" />
    </svg>
  );
}

function RibbonIcon() {
  return (
    <svg
      width="18"
      height="12"
      viewBox="0 0 40 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M20 12 6 4Q2 3 3 8L4 16Q3 21 8 20Z"
        fill="var(--osh-rose)"
      />
      <path
        d="M20 12 34 4Q38 3 37 8L36 16Q37 21 32 20Z"
        fill="var(--osh-rose)"
      />
      <circle cx="20" cy="12" r="3.6" fill="var(--osh-violet)" />
    </svg>
  );
}

export function OshigotoPage() {
  const {
    data,
    error,
    isError,
    isPending,
    refetch,
    incrementTask,
    decrementTask,
    revealedReward,
    closeReveal,
    gaugeCount: count,
    syncText,
    saveError,
  } = useOshigotoTasks();
  const [cheer, setCheer] = useState<{ taskId: string } | null>(null);
  const [collectedZombies, setCollectedZombies] = useState<Zombie[]>([]);
  const [dropTick, setDropTick] = useState(0);
  const [lastAction, setLastAction] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const undoTimer = useRef<number | null>(null);

  const tasks: Task[] = (data?.tasks ?? []).map((apiTask, index) => {
    const visual = INITIAL_TASKS.find((task) => task.id === apiTask.slug);
    return {
      id: apiTask.slug,
      emoji: visual?.emoji ?? "✨",
      label: apiTask.title,
      praise: visual?.praise ?? `${apiTask.title}、できたね！`,
      count: apiTask.count,
      tone: visual?.tone ?? (index % 2 === 0 ? "lav" : "peri"),
    };
  });

  const revealed =
    revealedReward === null
      ? null
      : (ZOMBIES.find(
          (zombie) => zombie.id === revealedReward.item_slug,
        ) ?? {
          id: revealedReward.item_slug,
          emoji: "🎁",
          name: "ひみつのごほうび",
        });

  const handleIncrementTask = (id: string) => {
    incrementTask(id);
    setCheer({ taskId: id });
    setDropTick((tick) => tick + 1);
    const task = tasks.find((item) => item.id === id);
    if (task) {
      setLastAction({ id, label: task.label });
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => setLastAction(null), 5_000);
    }
  };

  const undoLastIncrement = () => {
    if (!lastAction) return;
    decrementTask(lastAction.id);
    setLastAction(null);
    setCheer(null);
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  const handleCloseReveal = () => {
    if (!revealed) return;

    setCollectedZombies((prev) => [...prev, revealed]);
    setCheer(null);
    closeReveal();
  };

  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    },
    [],
  );

  const carryover = revealed !== null ? (data?.summary.gauge_count ?? 0) : 0;

  return (
    <>
    <OshigotoPageShell>
        <header className="mb-4 flex items-center gap-2.5">
          <ShizukuIcon />
          <div className="min-w-0">
            <p className="text-base font-extrabold text-[var(--osh-ink)]">
              おかえり、あきちゃん
            </p>
            <p className="text-xs font-medium text-[var(--osh-ink-soft)]">
              今夜も 月が育つよ
            </p>
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--osh-line2)] bg-[var(--osh-violet-soft)] px-2.5 py-1 text-[11.5px] font-extrabold text-[var(--osh-violet-deep)]">
            🦇 よる
          </span>
        </header>

        {syncText && (
          <p
            className="-mt-2 mb-2 text-right text-[11px] text-[var(--osh-ink-faint)]"
            role="status"
            aria-live="polite"
          >
            {syncText}
          </p>
        )}
        {saveError && (
          <p
            className="-mt-2 mb-2 text-right text-[11px] text-[var(--osh-ink-soft)]"
            role="alert"
          >
            {saveError}
          </p>
        )}

        <OshigotoTabs />

        <ProgressHero count={count} />

        <div className="mt-4 flex items-center gap-2 px-0.5">
          <RibbonIcon />
          <h2 className="shrink-0 text-[13px] font-extrabold tracking-wide text-[var(--osh-ink)]">
            今日の くらしのおしごと
          </h2>
          <span
            className="h-px flex-1 bg-[var(--osh-line2)]"
            aria-hidden="true"
          />
        </div>

        <div className="mt-2.5 overflow-hidden rounded-2xl border border-[var(--osh-line)] bg-[var(--osh-card)] shadow-[var(--osh-shadow-sm)]">
          {isPending && (
            <p className="px-3 py-5 text-center text-xs text-[var(--osh-ink-soft)]">
              今日のおしごとを読み込んでいます…
            </p>
          )}
          {isError && !data && (
            <div className="px-3 py-5 text-center" role="alert">
              <p className="text-xs text-[var(--osh-ink-soft)]">
                {error instanceof Error
                  ? error.message
                  : "おしごとを読み込めませんでした。"}
              </p>
              <button
                type="button"
                className="mt-2 min-h-11 px-3 text-xs font-bold text-[var(--osh-violet-deep)] underline"
                onClick={() => void refetch()}
              >
                もう一度試す
              </button>
            </div>
          )}
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onIncrement={handleIncrementTask}
            />
          ))}
        </div>

        <ChallengeCard />

        <p className="mt-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--osh-line2)] bg-[var(--osh-violet-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--osh-violet-deep)]">
            🎀 {STREAK_DAYS}日 続いてるよ
          </span>
        </p>

        {collectedZombies.length > 0 && (
          <p className="sr-only" aria-live="polite">
            図鑑に{collectedZombies.length}体のゾンビを集めました
          </p>
        )}
    </OshigotoPageShell>

      {cheer && !revealed && (() => {
        const cheerTask = tasks.find((item) => item.id === cheer.taskId);
        if (!cheerTask) return null;
        return (
          <CheerOverlay
            key={`${cheer.taskId}-${dropTick}`}
            task={cheerTask}
            count={count}
            onUndo={undoLastIncrement}
            onClose={() => setCheer(null)}
          />
        );
      })()}

      {revealed && (
        <ZombieRevealModal
          zombie={revealed}
          carryover={carryover}
          onClose={handleCloseReveal}
        />
      )}

      {lastAction && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-22 left-1/2 z-50 flex w-[min(92vw,30rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-[var(--text)] px-4 py-3 text-sm text-white shadow-xl xl:bottom-7"
        >
          <span className="font-bold">
            {lastAction.label}を1件記録しました
          </span>
          <Button
            onClick={undoLastIncrement}
            variant="solid"
            tone="neutral"
            size="compact"
            icon={Undo2}
            className="shrink-0 bg-white text-[var(--text)]"
          >
            取り消す
          </Button>
        </div>
      )}
    </>
  );
}
