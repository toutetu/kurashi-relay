import {
  Backpack,
  BriefcaseBusiness,
  Clock3,
  Gamepad2,
  House,
  Moon,
  Plus,
  TimerReset,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cancelHomeEvent, createHomeEvent } from "../../../api/home";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/DashboardPrimitives";
import type {
  ActivityCategory,
  QuickLog,
  QuickLogType,
} from "../../../types/dashboard";
import type { LocalActivity } from "../../../types/local";

const quickActivities: Array<{
  category: ActivityCategory;
  label: string;
  icon: LucideIcon;
  chipClass: string;
}> = [
  {
    category: "work_preparation",
    label: "就労準備",
    icon: BriefcaseBusiness,
    chipClass: "bg-[var(--cat-blue-soft)] text-[var(--cat-blue)]",
  },
  {
    category: "housework",
    label: "家事",
    icon: House,
    chipClass: "bg-[var(--amber-soft)] text-[var(--amber)]",
  },
  {
    category: "school_support",
    label: "登校支援",
    icon: Backpack,
    chipClass: "bg-[var(--green-soft)] text-[var(--green)]",
  },
  {
    category: "waiting",
    label: "待機",
    icon: Clock3,
    chipClass: "bg-[var(--cat-blue-soft)] text-[var(--cat-blue)]",
  },
  {
    category: "recovery",
    label: "回復・休息",
    icon: Moon,
    chipClass: "bg-[var(--fuji-soft)] text-[var(--fuji)]",
  },
  {
    category: "last_war",
    label: "ラストウォー",
    icon: Gamepad2,
    chipClass: "bg-[var(--coral-soft)] text-[var(--coral)]",
  },
];

export function QuickStartCard({
  onStart,
  runningCategory = null,
}: {
  onStart: (activity: LocalActivity) => void;
  runningCategory?: ActivityCategory | null;
}) {
  const startActivity = (category: ActivityCategory, label: string) =>
    onStart({
      id: `local-${category}-${new Date().toISOString()}`,
      title: label,
      category,
      startedAt: new Date().toISOString(),
      status: "running",
      relatedPlanTitle: null,
      pausedAt: null,
      completedAt: null,
      totalPausedMilliseconds: 0,
    });

  return (
    <DashboardCard
      id="quick-start"
      title="クイック活動記録"
      icon={Clock3}
      tone="blue"
      density="compact"
    >
      <div className="grid grid-cols-3 gap-2">
        {quickActivities.map(({ category, label, icon: Icon, chipClass }) => {
          const running = runningCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => startActivity(category, label)}
              className="pressable relative flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-[var(--surface)] px-1 py-1.5 text-[11px] font-bold text-[var(--ink)] transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              style={
                running
                  ? {
                      borderColor:
                        "color-mix(in srgb, var(--green) 45%, var(--line))",
                      background:
                        "color-mix(in srgb, var(--green-soft) 45%, var(--surface))",
                    }
                  : { borderColor: "var(--line)" }
              }
            >
              {running && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-2 size-2 rounded-full bg-[var(--green)]"
                />
              )}
              <span
                className={`grid size-[34px] place-items-center rounded-full ${chipClass}`}
              >
                <Icon aria-hidden="true" size={15} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--faint)]">
        この画面での変更は、まだサーバーには保存されません。
      </p>
    </DashboardCard>
  );
}

export function QuickLogsCard({ initialLogs }: { initialLogs: QuickLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [flyKeys, setFlyKeys] = useState<Partial<Record<QuickLogType, number>>>(
    {},
  );
  const [lastAction, setLastAction] = useState<{
    type: QuickLogType;
    label: string;
    eventId: number;
  } | null>(null);
  const [savingType, setSavingType] = useState<QuickLogType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    },
    [],
  );

  const addLog = async (log: QuickLog) => {
    if (!log.activityDefinitionId) {
      setErrorMessage("この項目はまだ記録用マスタがありません。");
      return;
    }
    if (savingType !== null) return;

    setSavingType(log.type);
    setErrorMessage(null);
    const idempotencyKey = `quick:${log.type}:${crypto.randomUUID()}`;

    try {
      const event = await createHomeEvent({
        activity_definition_id: log.activityDefinitionId,
        idempotency_key: idempotencyKey,
      });

      setLogs((current) =>
        current.map((item) =>
          item.type === log.type ? { ...item, count: item.count + 1 } : item,
        ),
      );
      setFlyKeys((current) => ({
        ...current,
        [log.type]: (current[log.type] ?? 0) + 1,
      }));
      setLastAction({ type: log.type, label: log.label, eventId: event.id });
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => setLastAction(null), 5_000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "記録の保存に失敗しました。もう一度お試しください。",
      );
    } finally {
      setSavingType(null);
    }
  };

  const undo = async () => {
    if (!lastAction) return;
    const action = lastAction;
    setLastAction(null);
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);

    try {
      await cancelHomeEvent(action.eventId);
      setLogs((current) =>
        current.map((item) =>
          item.type === action.type
            ? { ...item, count: Math.max(0, item.count - 1) }
            : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "取り消しに失敗しました。",
      );
    }
  };

  return (
    <>
      <DashboardCard
        title="クイック記録"
        icon={TimerReset}
        tone="yellow"
        density="compact"
      >
        {logs.length > 0 ? (
          <ul className="-mx-1.5 list-none p-0">
            {logs.map((log) => {
              const flyKey = flyKeys[log.type];
              return (
                <li
                  key={log.type}
                  className="border-t border-[var(--line-soft)] first:border-t-0"
                >
                  <button
                    type="button"
                    aria-label={`${log.label}を記録。現在${log.count}件`}
                    disabled={savingType !== null}
                    onClick={() => void addLog(log)}
                    className="pressable group relative flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 py-1 text-left text-[13px] font-semibold text-[var(--ink)] transition hover:bg-[color-mix(in_srgb,var(--primary-soft)_65%,var(--surface))] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1 truncate">{log.label}</span>
                    <span
                      key={log.count}
                      className={`count-bump rounded-full px-2.5 text-xs font-black tabular-nums ${
                        log.count === 0
                          ? "bg-[var(--neutral-soft)] text-[var(--faint)]"
                          : "bg-[var(--primary-soft)] text-[var(--primary-deep)]"
                      }`}
                    >
                      {log.count}件
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-deep)] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                      <Plus aria-hidden="true" size={14} strokeWidth={2.4} />
                    </span>
                    {flyKey !== undefined && flyKey > 0 && (
                      <span
                        key={flyKey}
                        className="fly"
                        aria-hidden="true"
                      >
                        +1
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>記録できる項目はありません。</EmptyState>
        )}
        {errorMessage && (
          <p className="mt-2 text-xs font-bold text-[var(--coral)]" role="alert">
            {errorMessage}
          </p>
        )}
      </DashboardCard>
      {lastAction && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-22 left-1/2 z-50 flex w-[min(92vw,30rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-[var(--text)] px-4 py-3 text-sm text-white shadow-xl xl:bottom-7"
        >
          <span className="font-bold">{lastAction.label}を1件記録しました</span>
          <Button
            onClick={() => void undo()}
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
