import { useEffect, useRef, useState } from "react";
import { ChallengeCard } from "../features/oshigoto/components/ChallengeCard";
import { OshigotoPageShell } from "../features/oshigoto/components/OshigotoPageShell";
import { OshigotoTabs } from "../features/oshigoto/components/OshigotoTabs";
import { ProgressHero } from "../features/oshigoto/components/ProgressHero";
import { TaskRow } from "../features/oshigoto/components/TaskRow";
import { ZombieRevealModal } from "../features/oshigoto/components/ZombieRevealModal";
import {
  countCompletedTasks,
  INITIAL_JAR,
  INITIAL_TASKS,
  pickRandomZombie,
  STAMP_SIZE,
  STREAK_DAYS,
  type Task,
  type Zombie,
} from "../features/oshigoto/data";
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
  const [tasks, setTasks] = useState<Task[]>(() =>
    INITIAL_TASKS.map((task) => ({ ...task })),
  );
  const [count, setCount] = useState(
    () => INITIAL_JAR + countCompletedTasks(INITIAL_TASKS),
  );
  const [revealed, setRevealed] = useState<Zombie | null>(null);
  const [collectedZombies, setCollectedZombies] = useState<Zombie[]>([]);
  const [plusOneTaskId, setPlusOneTaskId] = useState<string | null>(null);
  const plusOneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    const nextDone = !task.done;

    setTasks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: nextDone } : item,
      ),
    );

    setCount((current) => {
      const nextCount = nextDone ? current + 1 : Math.max(0, current - 1);
      if (nextDone && nextCount >= STAMP_SIZE) {
        setRevealed(pickRandomZombie());
      }
      return nextCount;
    });

    if (nextDone) {
      if (plusOneTimerRef.current) clearTimeout(plusOneTimerRef.current);
      setPlusOneTaskId(id);
      plusOneTimerRef.current = setTimeout(() => {
        setPlusOneTaskId(null);
        plusOneTimerRef.current = null;
      }, 2400);
    } else {
      setPlusOneTaskId((current) => (current === id ? null : current));
    }
  };

  const handleCloseReveal = () => {
    if (!revealed) return;

    setCollectedZombies((prev) => [...prev, revealed]);
    setCount((current) => Math.max(0, current - STAMP_SIZE));
    setRevealed(null);
  };

  useEffect(() => {
    return () => {
      if (plusOneTimerRef.current) clearTimeout(plusOneTimerRef.current);
    };
  }, []);

  const carryover =
    revealed !== null ? Math.max(0, count - STAMP_SIZE) : 0;

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
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggleTask}
              showPlusOne={plusOneTaskId === task.id}
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

      {revealed && (
        <ZombieRevealModal
          zombie={revealed}
          carryover={carryover}
          onClose={handleCloseReveal}
        />
      )}
    </>
  );
}
