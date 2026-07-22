import {
  Activity,
  AlarmClock,
  CalendarDays,
  Clock3,
  GitCompareArrows,
  Heart,
  Moon,
  Pencil,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "../../../components/ui/Button";
import type {
  ActualEntry,
  ActualKind,
  DifferenceStatus,
  ScheduleComparisonItem,
  SchedulePlan,
} from "../../../types/dashboard";
import {
  formatMinutes,
  formatTimeRange,
  toTokyoTimeInputValue,
} from "../../../utils/date";

const TOKYO = "Asia/Tokyo";
const PX_PER_HOUR = 56;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
const DEFAULT_START_MINUTE = 6 * 60;
const DEFAULT_END_MINUTE = 22 * 60;
const MIN_EVENT_MINUTES = 30;
const DAY_MINUTES = 24 * 60;

const differenceLabels: Record<DifferenceStatus, string> = {
  on_schedule: "予定どおり",
  delayed: "開始遅れ",
  interrupted: "中断",
  cancelled: "中止",
  moved_to_night: "夜へ振り替え",
  unplanned_activity: "予定外",
  no_plan_no_record: "記録なし",
};

const differenceStyles: Record<DifferenceStatus, string> = {
  on_schedule: "border-[#9bc9aa] bg-[#e7f7ed] text-[#287a49]",
  delayed: "border-[#e6d08a] bg-[#fff0b8] text-[#77550b]",
  interrupted: "border-[#e8a8ab] bg-[#ffe0e1] text-[#a4373d]",
  cancelled: "border-[#e8a8ab] bg-[#ffe0e1] text-[#a4373d]",
  moved_to_night: "border-[#cfc1f5] bg-[#eee8ff] text-[#684baa]",
  unplanned_activity: "border-[#cfc1f5] bg-[#eee8ff] text-[#684baa]",
  no_plan_no_record: "border-[var(--line)] bg-[var(--neutral-soft)] text-[#526078]",
};

const kindMetadata: Record<
  ActualKind,
  { label: string; icon: LucideIcon; style: string }
> = {
  sleep: { label: "睡眠", icon: Moon, style: "bg-[#edf6ff] text-[#236da8]" },
  activity: {
    label: "活動",
    icon: Activity,
    style: "bg-[#e7f7ed] text-[#287a49]",
  },
  waiting: {
    label: "待機",
    icon: Clock3,
    style: "bg-[#fff8db] text-[#77550b]",
  },
  recovery: {
    label: "回復",
    icon: Heart,
    style: "bg-[#fff0f1] text-[#a4373d]",
  },
};

type PlanHandlers = {
  onStart: (plan: SchedulePlan) => Promise<void>;
  onCompleteAsPlanned: (plan: SchedulePlan) => Promise<void>;
  onSkip: (plan: SchedulePlan) => Promise<void>;
  onSaveDetail: (
    plan: SchedulePlan,
    startAt: string,
    endAt: string,
  ) => Promise<void>;
};

type ActualHandlers = {
  onDelete: (actual: ActualEntry) => Promise<void>;
  onUpdate: (
    actual: ActualEntry,
    startAt: string,
    endAt: string,
  ) => Promise<void>;
};

function tokyoMinuteOfDay(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TOKYO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour ?? "0");
  const minute = Number(values.minute ?? "0");
  return hour * 60 + minute;
}

function formatHourLabel(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function blockStyle(
  startAt: string,
  endAt: string,
  startMinute: number,
): { top: number; height: number } {
  const start = tokyoMinuteOfDay(startAt);
  const rawEnd = tokyoMinuteOfDay(endAt);
  const end = Math.max(rawEnd, start + MIN_EVENT_MINUTES);
  return {
    top: (start - startMinute) * PX_PER_MINUTE,
    height: Math.max((end - start) * PX_PER_MINUTE, 28),
  };
}

function resolveWindow(ranges: Array<{ startAt: string; endAt: string }>): {
  startMinute: number;
  endMinute: number;
} {
  if (ranges.length === 0) {
    return {
      startMinute: DEFAULT_START_MINUTE,
      endMinute: DEFAULT_END_MINUTE,
    };
  }

  let minStart = DAY_MINUTES;
  let maxEnd = 0;
  for (const range of ranges) {
    const start = tokyoMinuteOfDay(range.startAt);
    const end = Math.max(tokyoMinuteOfDay(range.endAt), start + MIN_EVENT_MINUTES);
    minStart = Math.min(minStart, start);
    maxEnd = Math.max(maxEnd, end);
  }

  const startMinute = Math.min(
    DEFAULT_START_MINUTE,
    Math.max(0, Math.floor(minStart / 60) * 60),
  );
  const endMinute = Math.max(
    DEFAULT_END_MINUTE,
    Math.min(DAY_MINUTES, Math.ceil(maxEnd / 60) * 60),
  );

  return {
    startMinute,
    endMinute: Math.max(endMinute, startMinute + 60),
  };
}

function PlanActionButton({
  label,
  onClick,
  disabled,
  tone = "neutral",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-deep)]"
      : tone === "danger"
        ? "border-[color-mix(in_srgb,var(--coral)_40%,var(--line))] text-[var(--coral)]"
        : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`pressable inline-flex min-h-6 items-center justify-center rounded-md border px-1 py-0 text-[9px] font-bold leading-none transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function PlanEventCard({
  plan,
  date,
  startMinute,
  busy,
  handlers,
}: {
  plan: SchedulePlan;
  date: string;
  startMinute: number;
  busy: boolean;
  handlers?: PlanHandlers;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [startTime, setStartTime] = useState(() =>
    toTokyoTimeInputValue(plan.startAt),
  );
  const [endTime, setEndTime] = useState(() =>
    toTokyoTimeInputValue(plan.endAt),
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const settled = plan.outcome === "done" || plan.outcome === "skipped";
  const recordable =
    plan.recordable === true && handlers !== undefined && !settled;
  const outcomeLabel =
    plan.outcome === "done"
      ? "記録済み"
      : plan.outcome === "skipped"
        ? "中止"
        : null;
  const style = blockStyle(plan.startAt, plan.endAt, startMinute);
  const open = expanded || detailOpen;

  const saveDetail = async () => {
    if (!handlers) return;
    setDetailError(null);
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      setDetailError("開始・終了の時刻を入力してください。");
      return;
    }
    if (endTime < startTime) {
      setDetailError("終了は開始と同じか、それより後にしてください。");
      return;
    }
    try {
      await handlers.onSaveDetail(
        plan,
        `${date}T${startTime}:00+09:00`,
        `${date}T${endTime}:00+09:00`,
      );
      setDetailOpen(false);
      setExpanded(false);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "記録の保存に失敗しました。もう一度お試しください。",
      );
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => {
        if (!recordable) return;
        setExpanded((current) => {
          if (current) setDetailOpen(false);
          return !current;
        });
      }}
      onKeyDown={(event) => {
        if (!recordable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => {
            if (current) setDetailOpen(false);
            return !current;
          });
        }
      }}
      className={`comparison-grid absolute inset-x-1 rounded-xl border border-[#bcdcf7] bg-[#edf6ff] px-2 py-1 ${settled ? "opacity-55" : ""} ${open ? "z-20 overflow-visible shadow-md" : "z-10 overflow-hidden"} ${recordable ? "cursor-pointer" : ""}`}
      style={{
        top: style.top,
        height: open ? "auto" : style.height,
        minHeight: style.height,
      }}
      title={recordable ? `${plan.title}（クリックで操作）` : plan.title}
    >
      <p className="truncate text-[12px] font-bold text-[var(--ink)]">
        {plan.title}
        {outcomeLabel && (
          <span className="ml-1 text-[9px] font-bold text-[var(--muted)]">
            {outcomeLabel}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[10px] tabular-nums text-[var(--muted)]">
        {formatTimeRange(plan.startAt, plan.endAt)}
      </p>
      {recordable && open && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          <PlanActionButton
            label="開始"
            tone="primary"
            disabled={busy}
            onClick={() => void handlers!.onStart(plan)}
          />
          <PlanActionButton
            label="計画通り"
            disabled={busy}
            onClick={() => void handlers!.onCompleteAsPlanned(plan)}
          />
          <PlanActionButton
            label="中止"
            tone="danger"
            disabled={busy}
            onClick={() => void handlers!.onSkip(plan)}
          />
          <PlanActionButton
            label="詳細"
            disabled={busy}
            onClick={() => {
              setStartTime(toTokyoTimeInputValue(plan.startAt));
              setEndTime(toTokyoTimeInputValue(plan.endAt));
              setDetailError(null);
              setDetailOpen((current) => !current);
            }}
          />
        </div>
      )}
      {detailOpen && recordable && (
        <div
          className="mt-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-end gap-1">
            <label className="text-[9px] font-bold text-[var(--muted)]">
              開始
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-0.5 block min-h-7 rounded-md border border-[var(--line)] px-1 text-[11px] font-bold text-[var(--ink)]"
              />
            </label>
            <label className="text-[9px] font-bold text-[var(--muted)]">
              終了
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-0.5 block min-h-7 rounded-md border border-[var(--line)] px-1 text-[11px] font-bold text-[var(--ink)]"
              />
            </label>
            <Button
              onClick={() => void saveDetail()}
              disabled={busy}
              variant="solid"
              tone="blue"
              size="compact"
              className="!min-h-7 !px-1.5 !text-[9px]"
            >
              保存
            </Button>
          </div>
          {detailError && (
            <p className="mt-1 text-[9px] font-bold text-[var(--coral)]" role="alert">
              {detailError}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ActualEventCard({
  actual,
  date,
  startMinute,
  busy,
  handlers,
}: {
  actual: ActualEntry;
  date: string;
  startMinute: number;
  busy: boolean;
  handlers?: ActualHandlers;
}) {
  const metadata = kindMetadata[actual.kind];
  const Icon = metadata.icon;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState(() =>
    toTokyoTimeInputValue(actual.startAt),
  );
  const [endTime, setEndTime] = useState(() =>
    toTokyoTimeInputValue(actual.endAt),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const style = blockStyle(actual.startAt, actual.endAt, startMinute);
  const open = expanded || editing;
  const interactive = handlers !== undefined;

  const save = async () => {
    if (!handlers) return;
    setErrorMessage(null);
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      setErrorMessage("開始・終了の時刻を入力してください。");
      return;
    }
    if (endTime < startTime) {
      setErrorMessage("終了は開始と同じか、それより後にしてください。");
      return;
    }
    try {
      await handlers.onUpdate(
        actual,
        `${date}T${startTime}:00+09:00`,
        `${date}T${endTime}:00+09:00`,
      );
      setEditing(false);
      setExpanded(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "修正の保存に失敗しました。もう一度お試しください。",
      );
    }
  };

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-expanded={interactive ? open : undefined}
      onClick={() => {
        if (!interactive) return;
        setExpanded((current) => {
          if (current) setEditing(false);
          return !current;
        });
      }}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => {
            if (current) setEditing(false);
            return !current;
          });
        }
      }}
      className={`absolute inset-x-1 rounded-xl border border-[#cbe7d5] bg-[#eff9f2] px-2 py-1 ${open ? "z-20 overflow-visible shadow-md" : "z-10 overflow-hidden"} ${interactive ? "cursor-pointer" : ""}`}
      style={{
        top: style.top,
        height: open ? "auto" : style.height,
        minHeight: style.height,
      }}
      title={interactive ? `${actual.title}（クリックで操作）` : actual.title}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-[var(--ink)]">
          {actual.title}
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-black ${metadata.style}`}
        >
          <Icon aria-hidden="true" size={9} />
          {metadata.label}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] tabular-nums text-[var(--muted)]">
        {formatTimeRange(actual.startAt, actual.endAt)}
      </p>
      {handlers && open && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setStartTime(toTokyoTimeInputValue(actual.startAt));
              setEndTime(toTokyoTimeInputValue(actual.endAt));
              setErrorMessage(null);
              setEditing((current) => !current);
            }}
            disabled={busy}
            aria-label={`${actual.title}を修正`}
            className="pressable inline-flex min-h-6 items-center gap-0.5 rounded-md border border-[var(--line)] bg-white px-1 text-[9px] font-bold text-[var(--muted)] disabled:opacity-50"
          >
            <Pencil aria-hidden="true" size={10} />
            修正
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handlers.onDelete(actual);
            }}
            disabled={busy}
            aria-label={`${actual.title}を削除`}
            className="pressable inline-flex min-h-6 items-center gap-0.5 rounded-md border border-[color-mix(in_srgb,var(--coral)_35%,var(--line))] bg-white px-1 text-[9px] font-bold text-[var(--coral)] disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" size={10} />
            削除
          </button>
        </div>
      )}
      {editing && handlers && (
        <div
          className="mt-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-end gap-1">
            <label className="text-[9px] font-bold text-[var(--muted)]">
              開始
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-0.5 block min-h-7 rounded-md border border-[var(--line)] px-1 text-[11px] font-bold text-[var(--ink)]"
              />
            </label>
            <label className="text-[9px] font-bold text-[var(--muted)]">
              終了
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-0.5 block min-h-7 rounded-md border border-[var(--line)] px-1 text-[11px] font-bold text-[var(--ink)]"
              />
            </label>
            <Button
              onClick={() => void save()}
              disabled={busy}
              variant="solid"
              tone="blue"
              size="compact"
              className="!min-h-7 !px-1.5 !text-[9px]"
            >
              保存
            </Button>
          </div>
          {errorMessage && (
            <p className="mt-1 text-[9px] font-bold text-[var(--coral)]" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function DifferenceEventCard({
  item,
  startMinute,
}: {
  item: ScheduleComparisonItem;
  startMinute: number;
}) {
  const style = blockStyle(item.timeRange.start, item.timeRange.end, startMinute);
  const diff = item.difference;

  return (
    <article
      className={`absolute inset-x-1 overflow-hidden rounded-xl border px-2 py-1 ${differenceStyles[diff.status]}`}
      style={{ top: style.top, height: style.height }}
      title={differenceLabels[diff.status]}
    >
      <p className="flex items-center gap-1 text-[11px] font-black">
        <GitCompareArrows aria-hidden="true" size={12} />
        {differenceLabels[diff.status]}
      </p>
      <p className="mt-0.5 text-[10px] tabular-nums opacity-90">
        {diff.actualMinutes}分 / {diff.plannedMinutes}分
        {diff.startDelayMinutes > 0 && ` ・遅れ${formatMinutes(diff.startDelayMinutes)}`}
        {diff.lostMinutes > 0 && ` ・失${formatMinutes(diff.lostMinutes)}`}
      </p>
      {diff.causes.length > 0 && (
        <p className="mt-0.5 truncate text-[10px] opacity-80">
          {diff.causes.join("・")}
        </p>
      )}
    </article>
  );
}

function ColumnLane({
  hours,
  startMinute,
  height,
  children,
}: {
  hours: number[];
  startMinute: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      className="relative min-w-0 border-l border-[var(--line)] bg-[var(--surface)]"
      style={{ height }}
    >
      {hours.map((minute) => (
        <div
          key={minute}
          className="pointer-events-none absolute inset-x-0 border-t border-[var(--line-soft)]"
          style={{ top: (minute - startMinute) * PX_PER_MINUTE }}
          aria-hidden="true"
        />
      ))}
      {children}
    </div>
  );
}

export function ScheduleComparisonList({
  items,
  date,
  busyActualId = null,
  busyPlanId = null,
  onDeleteActual,
  onUpdateActual,
  onStartPlan,
  onCompletePlanAsPlanned,
  onSkipPlan,
  onSavePlanDetail,
}: {
  items: ScheduleComparisonItem[];
  date: string;
  busyActualId?: string | null;
  busyPlanId?: string | null;
  onDeleteActual?: (actual: ActualEntry) => Promise<void>;
  onUpdateActual?: (
    actual: ActualEntry,
    startAt: string,
    endAt: string,
  ) => Promise<void>;
  onStartPlan?: (plan: SchedulePlan) => Promise<void>;
  onCompletePlanAsPlanned?: (plan: SchedulePlan) => Promise<void>;
  onSkipPlan?: (plan: SchedulePlan) => Promise<void>;
  onSavePlanDetail?: (
    plan: SchedulePlan,
    startAt: string,
    endAt: string,
  ) => Promise<void>;
}) {
  const handlers =
    onDeleteActual && onUpdateActual
      ? { onDelete: onDeleteActual, onUpdate: onUpdateActual }
      : undefined;
  const planHandlers =
    onStartPlan && onCompletePlanAsPlanned && onSkipPlan && onSavePlanDetail
      ? {
          onStart: onStartPlan,
          onCompleteAsPlanned: onCompletePlanAsPlanned,
          onSkip: onSkipPlan,
          onSaveDetail: onSavePlanDetail,
        }
      : undefined;

  const plans = useMemo(
    () => items.flatMap((item) => (item.plan ? [item.plan] : [])),
    [items],
  );
  const actuals = useMemo(
    () => items.flatMap((item) => item.actuals),
    [items],
  );

  const { startMinute, endMinute } = useMemo(() => {
    const ranges: Array<{ startAt: string; endAt: string }> = [
      ...plans.map((plan) => ({ startAt: plan.startAt, endAt: plan.endAt })),
      ...actuals.map((actual) => ({
        startAt: actual.startAt,
        endAt: actual.endAt,
      })),
      ...items.map((item) => ({
        startAt: item.timeRange.start,
        endAt: item.timeRange.end,
      })),
    ];
    return resolveWindow(ranges);
  }, [plans, actuals, items]);

  const hours = useMemo(() => {
    const labels: number[] = [];
    for (let minute = startMinute; minute < endMinute; minute += 60) {
      labels.push(minute);
    }
    return labels;
  }, [startMinute, endMinute]);

  const height = (endMinute - startMinute) * PX_PER_MINUTE;

  if (items.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-[#bcdcf7] bg-white p-8 text-center">
        <CalendarDays
          className="mx-auto text-[#68a7e3]"
          aria-hidden="true"
          size={32}
        />
        <h2 className="mt-3 text-lg font-black text-[#28334a]">
          比較するデータはありません
        </h2>
        <p className="mt-2 text-[#667085]">
          この日の予定と実績はまだ登録されていません。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[28rem] space-y-2">
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <div aria-hidden="true" />
            <p className="text-sm font-black text-[#236da8]">予定</p>
            <p className="text-sm font-black text-[#287a49]">実績</p>
            <p className="text-sm font-black text-[#684baa]">差分</p>
          </div>

          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <div className="relative" style={{ height }} aria-hidden="true">
              {hours.map((minute) => (
                <div
                  key={minute}
                  className="absolute right-0 w-full border-t border-[var(--line-soft)] pr-1 text-right text-[10.5px] font-bold tabular-nums text-[var(--muted)]"
                  style={{ top: (minute - startMinute) * PX_PER_MINUTE }}
                >
                  {formatHourLabel(minute)}
                </div>
              ))}
            </div>

            <ColumnLane hours={hours} startMinute={startMinute} height={height}>
              {plans.map((plan) => (
                <PlanEventCard
                  key={plan.id}
                  plan={plan}
                  date={date}
                  startMinute={startMinute}
                  busy={busyPlanId !== null}
                  handlers={planHandlers}
                />
              ))}
            </ColumnLane>

            <ColumnLane hours={hours} startMinute={startMinute} height={height}>
              {actuals.map((actual) => (
                <ActualEventCard
                  key={actual.id}
                  actual={actual}
                  date={date}
                  startMinute={startMinute}
                  busy={busyActualId !== null}
                  handlers={handlers}
                />
              ))}
            </ColumnLane>

            <ColumnLane hours={hours} startMinute={startMinute} height={height}>
              {items
                .filter(
                  (item) =>
                    item.difference.status !== "no_plan_no_record" ||
                    item.plan !== null ||
                    item.actuals.length > 0,
                )
                .map((item) => (
                  <DifferenceEventCard
                    key={`${item.timeRange.start}-${item.timeRange.end}`}
                    item={item}
                    startMinute={startMinute}
                  />
                ))}
            </ColumnLane>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11.5px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm border border-[#bcdcf7] bg-[#edf6ff]"
            aria-hidden="true"
          />
          予定
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm border border-[#cbe7d5] bg-[#eff9f2]"
            aria-hidden="true"
          />
          実績
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm border border-[#cfc1f5] bg-[#eee8ff]"
            aria-hidden="true"
          />
          差分
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[#bcdcf7] bg-[#edf6ff] p-4 text-sm leading-relaxed text-[#285d8d]">
        <AlarmClock className="mt-0.5 shrink-0" aria-hidden="true" size={19} />
        <p>
          左の時刻軸に沿って、予定・実績・差分を並べています。ブロックのない帯が空白の時間です。カードをクリックすると操作ボタンが開きます。
        </p>
      </div>
    </div>
  );
}
