import { useEffect, useRef, useState } from "react";
import { KajiChallengeCard } from "../features/mamakaji/components/KajiChallengeCard";
import { KajiProgressHero } from "../features/mamakaji/components/KajiProgressHero";
import { KajiTaskRow } from "../features/mamakaji/components/KajiTaskRow";
import { MamaKajiPageShell } from "../features/mamakaji/components/MamaKajiPageShell";
import { MamaKajiTabs } from "../features/mamakaji/components/MamaKajiTabs";
import { PointsChip } from "../features/mamakaji/components/PointsChip";
import { SweetRevealModal } from "../features/mamakaji/components/SweetRevealModal";
import { useMamaKaji } from "../features/mamakaji/context/MamaKajiContext";
import {
  countCompletedKaji,
  INITIAL_JAR,
  INITIAL_KAJI,
  pickRandomSweet,
  STAMP_SIZE,
  STREAK_DAYS,
  type KajiTask,
  type Sweet,
} from "../features/mamakaji/data";
import "../features/mamakaji/mamakaji.css";

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
        fill="var(--mkj-rasp)"
      />
      <path
        d="M12 16s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"
        fill="var(--mkj-caramel)"
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
        fill="var(--mkj-rasp)"
      />
      <path
        d="M20 12 34 4Q38 3 37 8L36 16Q37 21 32 20Z"
        fill="var(--mkj-rasp)"
      />
      <circle cx="20" cy="12" r="3.6" fill="var(--mkj-caramel)" />
    </svg>
  );
}

export function MamaKajiPage() {
  const { collectSweet, points } = useMamaKaji();
  const [tasks, setTasks] = useState<KajiTask[]>(() =>
    INITIAL_KAJI.map((task) => ({ ...task })),
  );
  const [count, setCount] = useState(
    () => INITIAL_JAR + countCompletedKaji(INITIAL_KAJI),
  );
  const [revealed, setRevealed] = useState<Sweet | null>(null);
  const [plusOneTaskId, setPlusOneTaskId] = useState<string | null>(null);
  const [dropTick, setDropTick] = useState(0);
  const plusOneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef(0);

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
      countRef.current = nextCount;
      if (nextDone && nextCount >= STAMP_SIZE) {
        // キャンディが着地するのを見せてから、おやつ登場
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        revealTimerRef.current = setTimeout(() => {
          revealTimerRef.current = null;
          if (countRef.current >= STAMP_SIZE) {
            setRevealed(pickRandomSweet());
          }
        }, 800);
      }
      return nextCount;
    });

    if (nextDone) {
      setDropTick((tick) => tick + 1);
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

    collectSweet(revealed);
    setCount((current) => Math.max(0, current - STAMP_SIZE));
    setRevealed(null);
  };

  useEffect(() => {
    return () => {
      if (plusOneTimerRef.current) clearTimeout(plusOneTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const carryover = revealed !== null ? Math.max(0, count - STAMP_SIZE) : 0;

  return (
    <>
      <MamaKajiPageShell>
        <header className="mb-4 flex items-center gap-2.5">
          <ShizukuIcon />
          <div className="min-w-0">
            <p className="text-base font-extrabold text-[var(--mkj-ink)]">
              おつかれさま、ともこさん
            </p>
            <p className="text-xs font-medium text-[var(--mkj-ink-soft)]">
              今日も よくやってる
            </p>
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-rasp-soft)] px-2.5 py-1 text-[11.5px] font-extrabold text-[var(--mkj-rasp-deep)]">
            🍵 ひと息
          </span>
        </header>

        <MamaKajiTabs />

        <KajiProgressHero count={count} dropTick={dropTick} />

        <PointsChip />

        <div className="mt-4 flex items-center gap-2 px-0.5">
          <RibbonIcon />
          <h2 className="shrink-0 text-[13px] font-extrabold tracking-wide text-[var(--mkj-ink)]">
            今日の 家事
          </h2>
          <span
            className="h-px flex-1 bg-[var(--mkj-line2)]"
            aria-hidden="true"
          />
        </div>

        <div className="mt-2.5 overflow-hidden rounded-2xl border border-[var(--mkj-line)] bg-[var(--mkj-card)] shadow-[var(--mkj-shadow-sm)]">
          {tasks.map((task) => (
            <KajiTaskRow
              key={task.id}
              task={task}
              onToggle={handleToggleTask}
              showPlusOne={plusOneTaskId === task.id}
            />
          ))}
        </div>

        <KajiChallengeCard />

        <p className="mt-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-rasp-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--mkj-rasp-deep)]">
            🎫 {STREAK_DAYS}日 続いてる
          </span>
        </p>
      </MamaKajiPageShell>

      {revealed && (
        <SweetRevealModal
          sweet={revealed}
          carryover={carryover}
          points={points}
          onClose={handleCloseReveal}
        />
      )}
    </>
  );
}
