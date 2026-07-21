import {
  Activity,
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
  Heart,
  Moon,
  Pencil,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
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

const differenceLabels: Record<DifferenceStatus, string> = {
  on_schedule: "予定どおり",
  delayed: "開始遅れ",
  interrupted: "中断",
  cancelled: "中止",
  moved_to_night: "夜へ振り替え",
  unplanned_activity: "予定外の活動",
  no_plan_no_record: "記録なし",
};

const differenceStyles: Record<DifferenceStatus, string> = {
  on_schedule: "bg-[#e7f7ed] text-[#287a49]",
  delayed: "bg-[#fff0b8] text-[#77550b]",
  interrupted: "bg-[#ffe0e1] text-[#a4373d]",
  cancelled: "bg-[#ffe0e1] text-[#a4373d]",
  moved_to_night: "bg-[#eee8ff] text-[#684baa]",
  unplanned_activity: "bg-[#eee8ff] text-[#684baa]",
  no_plan_no_record: "bg-slate-100 text-[#526078]",
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
    label: "待機・拘束",
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
      onClick={onClick}
      disabled={disabled}
      className={`pressable inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function PlanBlock({
  plan,
  date,
  busy,
  handlers,
}: {
  plan: SchedulePlan;
  date: string;
  busy: boolean;
  handlers?: PlanHandlers;
}) {
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
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "記録の保存に失敗しました。もう一度お試しください。",
      );
    }
  };

  return (
    <div className={settled ? "opacity-60" : ""}>
      <time className="text-sm font-black text-[#236da8]">
        {formatTimeRange(plan.startAt, plan.endAt)}
      </time>
      <p className="mt-2 font-black text-[#28334a]">
        {plan.title}
        {outcomeLabel && (
          <span className="ml-1.5 text-[10px] font-bold text-[var(--muted)]">
            {outcomeLabel}
          </span>
        )}
      </p>
      {plan.details && plan.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[#526078]">
          {plan.details.map((detail) => (
            <li key={detail} className="flex gap-2">
              <span aria-hidden="true">・</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
      {recordable && (
        <div className="mt-2 flex flex-wrap gap-1.5">
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
            label="詳細入力"
            disabled={busy}
            onClick={() => {
              setStartTime(toTokyoTimeInputValue(plan.startAt));
              setEndTime(toTokyoTimeInputValue(plan.endAt));
              setDetailError(null);
              setDetailOpen((open) => !open);
            }}
          />
        </div>
      )}
      {detailOpen && recordable && (
        <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-bold text-[var(--muted)]">
              開始
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-0.5 block min-h-9 rounded-lg border border-[var(--line)] px-2 text-[13px] font-bold text-[var(--ink)]"
              />
            </label>
            <label className="text-[11px] font-bold text-[var(--muted)]">
              終了
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-0.5 block min-h-9 rounded-lg border border-[var(--line)] px-2 text-[13px] font-bold text-[var(--ink)]"
              />
            </label>
            <Button
              onClick={() => void saveDetail()}
              disabled={busy}
              variant="solid"
              tone="blue"
              size="compact"
              className="!min-h-9 !px-2.5 !text-[11px]"
            >
              保存
            </Button>
          </div>
          {detailError && (
            <p className="mt-1.5 text-[11px] font-bold text-[var(--coral)]" role="alert">
              {detailError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type ActualHandlers = {
  onDelete: (actual: ActualEntry) => Promise<void>;
  onUpdate: (
    actual: ActualEntry,
    startAt: string,
    endAt: string,
  ) => Promise<void>;
};

function ActualBlock({
  actual,
  date,
  busy,
  handlers,
}: {
  actual: ActualEntry;
  date: string;
  busy: boolean;
  handlers?: ActualHandlers;
}) {
  const metadata = kindMetadata[actual.kind];
  const Icon = metadata.icon;
  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState(() =>
    toTokyoTimeInputValue(actual.startAt),
  );
  const [endTime, setEndTime] = useState(() =>
    toTokyoTimeInputValue(actual.endAt),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "修正の保存に失敗しました。もう一度お試しください。",
      );
    }
  };

  return (
    <article className="rounded-xl border border-[#cbe7d5] bg-white/85 p-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <time className="text-sm font-black text-[#287a49]">
            {formatTimeRange(actual.startAt, actual.endAt)}
          </time>
          <p className="mt-2 font-black text-[#28334a]">{actual.title}</p>
          {actual.details.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[#526078]">
              {actual.details.map((detail) => (
                <li key={detail} className="flex gap-2">
                  <span aria-hidden="true">・</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
          {handlers && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setStartTime(toTokyoTimeInputValue(actual.startAt));
                  setEndTime(toTokyoTimeInputValue(actual.endAt));
                  setErrorMessage(null);
                  setEditing((open) => !open);
                }}
                disabled={busy}
                aria-label={`${actual.title}を修正`}
                className="pressable inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--neutral-soft)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <Pencil aria-hidden="true" size={16} />
                修正
              </button>
              <button
                type="button"
                onClick={() => void handlers.onDelete(actual)}
                disabled={busy}
                aria-label={`${actual.title}を削除`}
                className="pressable inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--coral)_35%,var(--line))] bg-white px-3 py-2 text-sm font-bold text-[var(--coral)] transition hover:bg-[var(--coral-soft)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={16} />
                削除
              </button>
            </div>
          )}
        </div>
        <span
          className={`inline-flex h-fit shrink-0 items-center gap-1 self-start rounded-full px-2 py-1 text-[0.68rem] font-black ${metadata.style}`}
        >
          <Icon aria-hidden="true" size={13} />
          {metadata.label}
        </span>
      </div>
      {editing && handlers && (
        <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-bold text-[var(--muted)]">
              開始
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-0.5 block min-h-9 rounded-lg border border-[var(--line)] px-2 text-[13px] font-bold text-[var(--ink)]"
              />
            </label>
            <label className="text-[11px] font-bold text-[var(--muted)]">
              終了
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-0.5 block min-h-9 rounded-lg border border-[var(--line)] px-2 text-[13px] font-bold text-[var(--ink)]"
              />
            </label>
            <Button
              onClick={() => void save()}
              disabled={busy}
              variant="solid"
              tone="blue"
              size="compact"
              className="!min-h-9 !px-2.5 !text-[11px]"
            >
              保存
            </Button>
          </div>
          {errorMessage && (
            <p className="mt-1.5 text-[11px] font-bold text-[var(--coral)]" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ComparisonRow({
  item,
  date,
  busyActualId,
  busyPlanId,
  handlers,
  planHandlers,
}: {
  item: ScheduleComparisonItem;
  date: string;
  busyActualId: string | null;
  busyPlanId: string | null;
  handlers?: ActualHandlers;
  planHandlers?: PlanHandlers;
}) {
  const noPlan = item.plan === null;
  const noActuals = item.actuals.length === 0;
  const isUnplanned = noPlan && !noActuals;

  return (
    <article className="comparison-grid grid min-w-0 grid-cols-1 gap-2 rounded-[1.4rem] border border-[#dce5ef] bg-white p-3 shadow-[0_8px_24px_rgba(40,51,74,0.06)] md:grid-cols-[5.25rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-0 md:overflow-hidden md:p-0 xl:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
      <header className="rounded-xl bg-[#28334a] px-3 py-2 text-white md:col-start-1 md:row-span-2 md:row-start-1 md:flex md:flex-col md:items-center md:justify-start md:rounded-none md:bg-[#f4f7fa] md:px-2 md:py-5 md:text-[#28334a] xl:row-span-1">
        <span className="text-xs font-bold opacity-80 md:mb-2">時刻</span>
        <time className="font-black md:text-center md:text-sm">
          {formatTimeRange(item.timeRange.start, item.timeRange.end)}
        </time>
      </header>

      <section
        className={`min-w-0 rounded-xl border p-3.5 md:col-start-2 md:row-start-1 md:rounded-none md:border-y-0 md:border-l md:border-r-0 md:p-4 ${noPlan ? "border-dashed border-[#9ac8ee] bg-[#f7fbff]" : "border-[#bcdcf7] bg-[#edf6ff]/65"}`}
      >
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#236da8]">
          <CalendarDays aria-hidden="true" size={17} />
          予定
        </h3>
        {item.plan ? (
          <PlanBlock
            plan={item.plan}
            date={date}
            busy={busyPlanId !== null}
            handlers={planHandlers}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[#9ac8ee] bg-white/75 p-3">
            <p className="font-black text-[#236da8]">予定なし</p>
            <p className="mt-1 text-sm leading-relaxed text-[#667085]">
              この時間には予定が登録されていません。
            </p>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-xl border border-[#cbe7d5] bg-[#eff9f2] p-3.5 md:col-start-3 md:row-start-1 md:rounded-none md:border-y-0 md:border-l md:border-r-0 md:p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#287a49]">
          <CheckCircle2 aria-hidden="true" size={17} />
          実績
        </h3>
        {isUnplanned && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eee8ff] px-3 py-1.5 text-xs font-black text-[#684baa]">
            <GitCompareArrows aria-hidden="true" size={14} />
            予定外の活動
          </p>
        )}
        {noActuals ? (
          <div className="rounded-xl border border-dashed border-[#9bc9aa] bg-white/75 p-3">
            <p className="font-black text-[#526078]">実績記録なし</p>
            <p className="mt-1 text-sm leading-relaxed text-[#667085]">
              この時間の実績はまだ入力されていません。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {item.actuals.map((actual) => (
              <ActualBlock
                key={actual.id}
                actual={actual}
                date={date}
                busy={busyActualId !== null}
                handlers={handlers}
              />
            ))}
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-xl border border-[#cfc1f5] bg-[#f8f5ff] p-3.5 md:col-span-2 md:col-start-2 md:row-start-2 md:rounded-none md:border-x md:border-b-0 md:p-4 xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:border-y-0 xl:border-r-0">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#684baa]">
          <GitCompareArrows aria-hidden="true" size={17} />
          差分・原因
        </h3>
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black ${differenceStyles[item.difference.status]}`}
        >
          {differenceLabels[item.difference.status]}
        </span>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4 xl:grid-cols-2">
          {item.difference.startDelayMinutes > 0 && (
            <div className="rounded-xl bg-white/80 p-2.5">
              <dt className="text-xs font-bold text-[#667085]">開始の遅れ</dt>
              <dd className="mt-1 font-black text-[#684baa]">
                {formatMinutes(item.difference.startDelayMinutes)}
              </dd>
            </div>
          )}
          <div className="rounded-xl bg-white/80 p-2.5">
            <dt className="text-xs font-bold text-[#667085]">実績 / 予定</dt>
            <dd className="mt-1 font-black text-[#684baa]">
              {item.difference.actualMinutes}分 /{" "}
              {item.difference.plannedMinutes}分
            </dd>
          </div>
          {item.difference.interruptionCount > 0 && (
            <div className="rounded-xl bg-white/80 p-2.5">
              <dt className="text-xs font-bold text-[#667085]">中断</dt>
              <dd className="mt-1 font-black text-[#684baa]">
                {item.difference.interruptionCount}回
              </dd>
            </div>
          )}
          {item.difference.lostMinutes > 0 && (
            <div className="rounded-xl bg-white/80 p-2.5">
              <dt className="text-xs font-bold text-[#667085]">失われた時間</dt>
              <dd className="mt-1 font-black text-[#684baa]">
                {formatMinutes(item.difference.lostMinutes)}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-3 text-sm leading-relaxed text-[#526078]">
          <span className="font-black">原因：</span>
          {item.difference.causes.length > 0
            ? item.difference.causes.join("・")
            : "特になし"}
        </div>
      </section>
    </article>
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
    <div>
      <div className="mb-2 hidden rounded-xl border border-[#dce5ef] bg-white px-0 font-black md:grid md:grid-cols-[5.25rem_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
        <span className="p-3 text-center text-sm text-[#526078]">時刻</span>
        <span className="border-l border-[#dce5ef] bg-[#edf6ff] p-3 text-[#236da8]">
          予定
        </span>
        <span className="border-l border-[#dce5ef] bg-[#eff9f2] p-3 text-[#287a49]">
          実績
        </span>
        <span className="hidden border-l border-[#dce5ef] bg-[#f8f5ff] p-3 text-[#684baa] xl:block">
          差分・原因
        </span>
      </div>
      <div className="relative space-y-4 before:absolute before:bottom-4 before:left-5 before:top-4 before:-z-0 before:w-0.5 before:bg-[#d8ecff] md:before:hidden">
        {items.map((item) => (
          <ComparisonRow
            key={`${item.timeRange.start}-${item.timeRange.end}`}
            item={item}
            date={date}
            busyActualId={busyActualId}
            busyPlanId={busyPlanId}
            handlers={handlers}
            planHandlers={planHandlers}
          />
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#bcdcf7] bg-[#edf6ff] p-4 text-sm leading-relaxed text-[#285d8d]">
        <AlarmClock className="mt-0.5 shrink-0" aria-hidden="true" size={19} />
        <p>
          「予定なし」の時間も、実績があれば予定外の活動として表示します。予定も実績もない時間は「実績記録なし」と表示します。
        </p>
      </div>
    </div>
  );
}
