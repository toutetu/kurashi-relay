import {
  CalendarDays,
  Heart,
  Moon,
  Sparkles,
  SunMedium,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { ScoreControl } from "../../../components/ui/ScoreControl";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import {
  EmptyState,
  SectionLink,
  StatusChip,
} from "../../../components/ui/DashboardPrimitives";
import type {
  ChildStrategy,
  ConditionInputSource,
  ConditionState,
  SchedulePlan,
  Score,
} from "../../../types/dashboard";
import {
  formatTime,
  formatTimeRange,
  toTokyoTimeInputValue,
} from "../../../utils/date";

type PlanActionHandlers = {
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
      className={`pressable rounded-lg border px-1.5 py-0.5 text-[10px] font-bold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function PlanRow({
  plan,
  date,
  isLast,
  busy,
  running,
  actions,
}: {
  plan: SchedulePlan;
  date: string;
  isLast: boolean;
  busy: boolean;
  running: boolean;
  actions?: PlanActionHandlers;
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
    plan.recordable === true && actions !== undefined && !settled;
  const isChildPlan = plan.subjectRole === "child";
  const outcomeLabel =
    plan.outcome === "done"
      ? "記録済み"
      : plan.outcome === "skipped"
        ? "中止"
        : null;

  const saveDetail = async () => {
    if (!actions) return;
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
      await actions.onSaveDetail(
        plan,
        `${date}T${startTime}:00+09:00`,
        `${date}T${endTime}:00+09:00`,
      );
      setDetailOpen(false);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "詳細の保存に失敗しました。もう一度お試しください。",
      );
    }
  };

  const timeClass = settled
    ? "text-[var(--muted)]"
    : isChildPlan
      ? "text-[var(--cat-blue-deep)]"
      : "text-[var(--primary-deep)]";
  const titleClass = settled
    ? "text-[var(--muted)]"
    : isChildPlan
      ? "text-[var(--cat-blue-deep)]"
      : "text-[var(--ink)]";
  const rangeClass = isChildPlan
    ? "text-[color-mix(in_srgb,var(--cat-blue-deep)_72%,var(--muted))]"
    : "text-[var(--muted)]";
  const dotClass = settled
    ? "border-[var(--muted)]"
    : running
      ? "border-[var(--green)]"
      : isChildPlan
        ? "border-[var(--cat-blue-deep)]"
        : "border-[var(--primary)]";

  return (
    <li className={`pb-3 last:pb-1 ${settled ? "opacity-55" : ""}`}>
      <div
        className={`flex gap-2 sm:gap-3 ${settled ? "grayscale" : ""} ${
          isChildPlan
            ? "rounded-xl border border-[color-mix(in_srgb,var(--cat-blue)_35%,var(--line))] bg-[var(--cat-blue-soft)] px-2 py-1.5 sm:px-2.5"
            : ""
        }`}
      >
        <time
          className={`w-11 shrink-0 pt-0.5 text-right text-[13.5px] font-extrabold tabular-nums ${timeClass}`}
        >
          {formatTime(plan.startAt)}
        </time>
        <span className="flex w-3.5 shrink-0 flex-col items-center">
          <span
            className={`mt-1 size-2.5 rounded-full border-[2.5px] bg-white ${dotClass}`}
          />
          {!isLast && (
            <span
              className={`mt-0.5 w-0.5 flex-1 rounded-sm ${
                isChildPlan ? "bg-[color-mix(in_srgb,var(--cat-blue)_45%,white)]" : "bg-[var(--line)]"
              }`}
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[13.5px] font-bold ${titleClass}`}>
            {plan.title}
            {isChildPlan && !settled && (
              <span className="ml-1.5 text-[10px] font-bold text-[var(--cat-blue)]">
                むすめ
              </span>
            )}
            {running && !settled && (
              <span className="ml-1.5 text-[10px] font-bold text-[var(--green)]">
                進行中
              </span>
            )}
            {outcomeLabel && (
              <span className="ml-1.5 text-[10px] font-bold text-[var(--muted)]">
                {outcomeLabel}
              </span>
            )}
          </span>
          <span className={`mt-0.5 block text-[11.5px] tabular-nums ${rangeClass}`}>
            {formatTimeRange(plan.startAt, plan.endAt)}
          </span>
        </span>
        {recordable && (
          <div className="flex max-w-[11.5rem] shrink-0 flex-wrap justify-end gap-1">
            <PlanActionButton
              label="開始"
              tone="primary"
              disabled={busy}
              onClick={() => void actions.onStart(plan)}
            />
            <PlanActionButton
              label="計画通り"
              disabled={busy}
              onClick={() => void actions.onCompleteAsPlanned(plan)}
            />
            <PlanActionButton
              label="中止"
              tone="danger"
              disabled={busy}
              onClick={() => void actions.onSkip(plan)}
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
      </div>
      {detailOpen && recordable && (
        <div className="mt-2 ml-[3.75rem] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 sm:ml-16">
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
    </li>
  );
}

export function NextPlansCard({
  plans,
  date,
  runningPlanId = null,
  busyPlanId = null,
  actions,
  errorMessage = null,
}: {
  plans: SchedulePlan[];
  date: string;
  runningPlanId?: string | null;
  busyPlanId?: string | null;
  actions?: PlanActionHandlers;
  errorMessage?: string | null;
}) {
  return (
    <DashboardCard
      title="今日の予定"
      icon={CalendarDays}
      tone="blue"
      density="compact"
      action={<SectionLink to="/schedule">詳しく見る</SectionLink>}
    >
      {plans.length > 0 ? (
        <ol className="list-none max-h-[min(70vh,36rem)] space-y-0 overflow-y-auto p-0">
          {plans.map((plan, index) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              date={date}
              isLast={index === plans.length - 1}
              busy={busyPlanId !== null}
              running={runningPlanId === plan.id}
              actions={actions}
            />
          ))}
        </ol>
      ) : (
        <EmptyState>今日の予定はありません。</EmptyState>
      )}
      {errorMessage && (
        <p className="mt-2 text-xs font-bold text-[var(--coral)]" role="alert">
          {errorMessage}
        </p>
      )}
    </DashboardCard>
  );
}

export function MotherConditionsCard({
  initialCondition,
}: {
  initialCondition: ConditionState;
}) {
  const [condition, setCondition] = useState(initialCondition);
  const update = (key: "physical" | "mood", score: Score) =>
    setCondition((current) => ({ ...current, [key]: score }));

  return (
    <DashboardCard
      title="母の体調と気分"
      icon={Heart}
      tone="red"
      density="compact"
    >
      <div className="space-y-2">
        <ScoreControl
          personLabel="母"
          label="体調"
          value={condition.physical}
          onChange={(score) => update("physical", score)}
          icon={Heart}
          tone="primary"
          appearance="hearts"
        />
        <ScoreControl
          personLabel="母"
          label="気分"
          value={condition.mood}
          onChange={(score) => update("mood", score)}
          icon={SunMedium}
          tone="primary"
          appearance="faces"
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted-text)]">
        1（低め）〜5（良い）。この画面での変更は、まだサーバーには保存されません。
      </p>
    </DashboardCard>
  );
}

const sourceLabels: Record<ConditionInputSource, string> = {
  self: "娘本人の入力",
  guardian_confirmed: "母が確認",
  guardian_observation: "母の観察",
};

const daughterSourceOptions: Array<{
  value: ConditionInputSource;
  label: string;
}> = [
  { value: "self", label: "娘本人" },
  { value: "guardian_confirmed", label: "母が確認" },
  { value: "guardian_observation", label: "母の観察" },
];

export function DaughterConditionsCard({
  initialCondition,
}: {
  initialCondition: ConditionState;
}) {
  const [condition, setCondition] = useState(initialCondition);
  const update = (key: "physical" | "mood", score: Score) =>
    setCondition((current) => ({ ...current, [key]: score }));

  return (
    <DashboardCard
      title="娘の体調と気分"
      icon={Heart}
      tone="daughter"
      density="regular"
    >
      <div className="space-y-3">
        <ScoreControl
          personLabel="娘"
          label="体調"
          value={condition.physical}
          onChange={(score) => update("physical", score)}
          icon={Heart}
          tone="daughter"
          appearance="hearts"
        />
        <ScoreControl
          personLabel="娘"
          label="気分"
          value={condition.mood}
          onChange={(score) => update("mood", score)}
          icon={SunMedium}
          tone="daughter"
          appearance="faces"
        />
        <fieldset>
          <legend className="mb-1 text-xs font-bold text-[var(--muted-text)]">
            入力者区分
          </legend>
          <div className="grid grid-cols-3 gap-1">
            {daughterSourceOptions.map((option) => {
              const selected = condition.inputSource === option.value;
              return (
                <Button
                  key={option.value}
                  aria-pressed={selected}
                  aria-label={`娘の入力者区分を${option.label}にする`}
                  onClick={() =>
                    setCondition((current) => ({
                      ...current,
                      inputSource: option.value,
                    }))
                  }
                  variant={selected ? "solid" : "outline"}
                  tone="daughter"
                  size="compact"
                  className="min-w-0 rounded-lg px-1 text-xs"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </fieldset>
      </div>
      <StatusChip tone="daughter">
        {sourceLabels[condition.inputSource]}
      </StatusChip>
    </DashboardCard>
  );
}

const confidenceLabels: Record<string, string> = {
  confident: "できそう",
  slightly_anxious: "少し不安",
  anxious: "かなり不安",
  unknown: "分からない",
};

export function ChildStrategyCard({
  strategy,
  detail = false,
}: {
  strategy: ChildStrategy;
  detail?: boolean;
}) {
  const supports =
    strategy.requestedSupports.length > 0
      ? strategy.requestedSupports.join("・")
      : "特にありません";
  const fallbacks =
    strategy.fallbackPlans.length > 0
      ? strategy.fallbackPlans.join("・")
      : "まだ決めていません";
  return (
    <DashboardCard
      title="娘の今日の作戦"
      icon={WandSparkles}
      tone="daughter"
      density={detail ? "regular" : "compact"}
      action={
        detail ? undefined : (
          <SectionLink to="/child-plan">詳しく見る</SectionLink>
        )
      }
    >
      <div
        className="mb-1 flex justify-end gap-1 text-[var(--daughter-purple)]"
        aria-hidden="true"
      >
        <Sparkles size={13} />
        <Moon size={16} />
        <Sparkles size={11} />
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs font-black text-[var(--daughter-purple)]">
            今日どうしたい？
          </dt>
          <dd className="font-bold leading-snug text-[var(--daughter-text)]">
            {strategy.desiredOutcome || "まだ決めていません"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-black text-[var(--daughter-purple)]">
            最初に試すこと
          </dt>
          <dd className="font-bold leading-snug text-[var(--daughter-text)]">
            {strategy.firstStep || "まだ決めていません"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-black text-[var(--daughter-purple)]">
            大人にしてほしいこと
          </dt>
          <dd className="leading-snug text-[var(--daughter-text)]">
            {supports}
          </dd>
        </div>
        {detail && (
          <>
            <div>
              <dt className="text-xs font-black text-[var(--daughter-purple)]">
                難しい場合の別案
              </dt>
              <dd className="leading-snug text-[var(--daughter-text)]">
                {fallbacks}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-black text-[var(--daughter-purple)]">
                今日の作戦メモ
              </dt>
              <dd className="leading-snug text-[var(--daughter-text)]">
                {strategy.note || "まだメモはありません"}
              </dd>
            </div>
          </>
        )}
      </dl>
      <StatusChip tone="daughter">
        <Heart aria-hidden="true" size={14} />
        自信：{confidenceLabels[strategy.confidence] ?? strategy.confidence}
      </StatusChip>
    </DashboardCard>
  );
}
