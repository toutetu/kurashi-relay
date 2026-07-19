import { useState } from "react";
import { KajiChallengeCard } from "../features/mamakaji/components/KajiChallengeCard";
import { KajiCheerOverlay } from "../features/mamakaji/components/KajiCheerOverlay";
import { KajiProgressHero } from "../features/mamakaji/components/KajiProgressHero";
import { KajiTaskRow } from "../features/mamakaji/components/KajiTaskRow";
import { MamaKajiPageShell } from "../features/mamakaji/components/MamaKajiPageShell";
import { MamaKajiTabs } from "../features/mamakaji/components/MamaKajiTabs";
import { PointsChip } from "../features/mamakaji/components/PointsChip";
import { SweetRevealModal } from "../features/mamakaji/components/SweetRevealModal";
import { useMamaKaji } from "../features/mamakaji/context/MamaKajiContext";
import {
  INITIAL_KAJI,
  STREAK_DAYS,
  SWEETS,
  type KajiTask,
  type Sweet,
} from "../features/mamakaji/data";
import { useMamaKajiTasks } from "../features/mamakaji/queries/useMamaKajiTasks";
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
  const { points } = useMamaKaji();
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
  } = useMamaKajiTasks();
  const [cheer, setCheer] = useState<{ taskId: string } | null>(null);
  const [dropTick, setDropTick] = useState(0);

  const tasks: KajiTask[] = (data?.tasks ?? []).map((apiTask, index) => {
    const visual = INITIAL_KAJI.find((task) => task.id === apiTask.slug);
    const fallbackTones: KajiTask["tone"][] = [
      "rasp",
      "sage",
      "plum",
      "cara",
    ];
    return {
      id: apiTask.slug,
      emoji: visual?.emoji ?? "✨",
      label: apiTask.title,
      praise: visual?.praise ?? `${apiTask.title}、おつかれさま！`,
      count: apiTask.count,
      tone: visual?.tone ?? fallbackTones[index % fallbackTones.length]!,
    };
  });

  const revealed: Sweet | null =
    revealedReward === null
      ? null
      : (SWEETS.find((sweet) => sweet.id === revealedReward.item_slug) ?? {
          id: revealedReward.item_slug,
          emoji: "🎁",
          name: "ひみつのおやつ",
          country: "どこかの国",
          flag: "🌍",
          recipe: ["箱を開ける", "香りを楽しむ", "一緒に味わう"],
          mapNote: "世界のどこかから届いたおやつ。",
          culture: "詳しいお話は、これからのお楽しみ。",
        });

  const handleIncrementTask = (id: string) => {
    incrementTask(id);
    setCheer({ taskId: id });
    setDropTick((tick) => tick + 1);
  };

  const handleCloseReveal = () => {
    if (!revealed) return;

    setCheer(null);
    closeReveal();
  };

  const carryover = revealed !== null ? (data?.summary.gauge_count ?? 0) : 0;

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

        {syncText && (
          <p
            className="-mt-2 mb-2 text-right text-[11px] text-[var(--mkj-ink-faint)]"
            role="status"
            aria-live="polite"
          >
            {syncText}
          </p>
        )}
        {saveError && (
          <p
            className="-mt-2 mb-2 text-right text-[11px] text-[var(--mkj-ink-soft)]"
            role="alert"
          >
            {saveError}
          </p>
        )}

        <MamaKajiTabs />

        <KajiProgressHero count={count} />

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
          {isPending && (
            <p className="px-3 py-5 text-center text-xs text-[var(--mkj-ink-soft)]">
              今日の家事を読み込んでいます…
            </p>
          )}
          {isError && !data && (
            <div className="px-3 py-5 text-center" role="alert">
              <p className="text-xs text-[var(--mkj-ink-soft)]">
                {error instanceof Error
                  ? error.message
                  : "今日の家事を読み込めませんでした。"}
              </p>
              <button
                type="button"
                className="mt-2 min-h-11 px-3 text-xs font-bold text-[var(--mkj-rasp-deep)] underline"
                onClick={() => void refetch()}
              >
                もう一度試す
              </button>
            </div>
          )}
          {tasks.map((task) => (
            <KajiTaskRow
              key={task.id}
              task={task}
              onIncrement={handleIncrementTask}
            />
          ))}
        </div>

        <KajiChallengeCard tasks={tasks} />

        <p className="mt-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-rasp-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--mkj-rasp-deep)]">
            🎫 {STREAK_DAYS}日 続いてる
          </span>
        </p>
      </MamaKajiPageShell>

      {cheer && !revealed && (() => {
        const cheerTask = tasks.find((item) => item.id === cheer.taskId);
        if (!cheerTask) return null;
        return (
          <KajiCheerOverlay
            key={`${cheer.taskId}-${dropTick}`}
            task={cheerTask}
            count={count}
            dropTick={dropTick}
            onUndo={() => decrementTask(cheer.taskId)}
            onClose={() => setCheer(null)}
          />
        );
      })()}

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
