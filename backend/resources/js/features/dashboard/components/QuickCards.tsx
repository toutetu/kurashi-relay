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
import { useEffect, useId, useRef, useState } from "react";
import { cancelHomeEvent, createHomeEvent } from "../../../api/home";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/DashboardPrimitives";
import type {
  ActivityCategory,
  QuickActivityOption,
  QuickLog,
  QuickLogType,
} from "../../../types/dashboard";

const quickActivityPresentation: Record<
  ActivityCategory,
  {
    icon: LucideIcon;
    chipClass: string;
  }
> = {
  work_preparation: {
    icon: BriefcaseBusiness,
    chipClass: "bg-[var(--cat-blue-soft)] text-[var(--cat-blue)]",
  },
  housework: {
    icon: House,
    chipClass: "bg-[var(--amber-soft)] text-[var(--amber)]",
  },
  school_support: {
    icon: Backpack,
    chipClass: "bg-[var(--green-soft)] text-[var(--green)]",
  },
  waiting: {
    icon: Clock3,
    chipClass: "bg-[var(--cat-blue-soft)] text-[var(--cat-blue)]",
  },
  recovery: {
    icon: Moon,
    chipClass: "bg-[var(--fuji-soft)] text-[var(--fuji)]",
  },
  last_war: {
    icon: Gamepad2,
    chipClass: "bg-[var(--coral-soft)] text-[var(--coral)]",
  },
};

export function QuickStartCard({
  activities,
  onStart,
  runningOptionId = null,
}: {
  activities: QuickActivityOption[];
  onStart: (activity: QuickActivityOption) => Promise<void>;
  runningOptionId?: string | null;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const presets = activities.filter((activity) => activity.source === "preset");

  const startActivity = async (activity: QuickActivityOption) => {
    if (savingId !== null) return;
    setSavingId(activity.id);
    setErrorMessage(null);

    try {
      await onStart(activity);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "活動の開始を保存できませんでした。もう一度お試しください。",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardCard
      id="quick-start"
      title="クイック活動記録"
      icon={Clock3}
      tone="blue"
      density="compact"
    >
      <div className="grid grid-cols-3 gap-2">
        {presets.map((activity) => {
          const presentation = quickActivityPresentation[activity.category];
          const Icon = presentation.icon;
          const running = runningOptionId === activity.id;

          return (
            <button
              key={activity.id}
              type="button"
              onClick={() => void startActivity(activity)}
              disabled={savingId !== null}
              aria-label={`${activity.label}を開始`}
              className="pressable relative flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-[var(--surface)] px-1 py-1.5 text-[11px] font-bold text-[var(--ink)] transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60"
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
                className={`grid size-[34px] place-items-center rounded-full ${presentation.chipClass}`}
              >
                <Icon aria-hidden="true" size={15} />
              </span>
              {activity.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--faint)]">
        開始時刻を保存し、「終了」で終了時刻も記録します。予定の操作は「きょうのようす」から行えます。
      </p>
      {errorMessage && (
        <p className="mt-2 text-xs font-bold text-[var(--coral)]" role="alert">
          {errorMessage}
        </p>
      )}
    </DashboardCard>
  );
}

function FreeNoteDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const hintId = useId();

  useEffect(() => {
    if (!open) return;
    setNote("");
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
        onClick={onCancel}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(note.trim());
        }}
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl sm:rounded-3xl sm:p-5"
      >
        <h2 id={titleId} className="text-base font-extrabold text-[var(--ink)]">
          自由記入
        </h2>
        <p id={hintId} className="mt-1 text-xs text-[var(--muted)]">
          いまやったこと・気づいたことを書いて記録できます（空でも記録可）
        </p>
        <textarea
          ref={inputRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="例: 買い物に行った、薬を飲んだ"
          className="mt-3 w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] placeholder:font-medium placeholder:text-[var(--faint)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        />
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            tone="neutral"
            className="min-h-11 flex-1"
          >
            やめる
          </Button>
          <Button type="submit" variant="solid" tone="blue" className="min-h-11 flex-1">
            記録する
          </Button>
        </div>
      </form>
    </div>
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
  const [freeNoteTarget, setFreeNoteTarget] = useState<QuickLog | null>(null);
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

  const addLog = async (log: QuickLog, note?: string) => {
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
        ...(note !== undefined && note !== "" ? { note } : {}),
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

  const handleLogClick = (log: QuickLog) => {
    if (log.type === "free_note") {
      setFreeNoteTarget(log);
      return;
    }
    void addLog(log);
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
                    onClick={() => handleLogClick(log)}
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
                      <span key={flyKey} className="fly" aria-hidden="true">
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
      <FreeNoteDialog
        open={freeNoteTarget !== null}
        onCancel={() => setFreeNoteTarget(null)}
        onConfirm={(note) => {
          const target = freeNoteTarget;
          setFreeNoteTarget(null);
          if (target) void addLog(target, note);
        }}
      />
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
