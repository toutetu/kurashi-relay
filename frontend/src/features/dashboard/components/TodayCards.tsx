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
import { formatTime, formatTimeRange } from "../../../utils/date";

export function NextPlansCard({ plans }: { plans: SchedulePlan[] }) {
  return (
    <DashboardCard
      title="次の予定"
      icon={CalendarDays}
      tone="blue"
      density="compact"
      action={<SectionLink to="/schedule">詳しく見る</SectionLink>}
    >
      {plans.length > 0 ? (
        <ol className="space-y-1.5">
          {plans.slice(0, 2).map((plan) => (
            <li
              key={plan.id}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--mother-blue)] bg-white/85 px-2.5 py-2"
            >
              <time className="w-11 shrink-0 text-center text-sm font-black text-[var(--mother-blue-strong)]">
                {formatTime(plan.startAt)}
              </time>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--text)]">
                  {plan.title}
                </span>
                <span className="block text-xs text-[var(--muted-text)]">
                  {formatTimeRange(plan.startAt, plan.endAt)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>次の予定はありません。</EmptyState>
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
          tone="red"
        />
        <ScoreControl
          personLabel="母"
          label="気分"
          value={condition.mood}
          onChange={(score) => update("mood", score)}
          icon={SunMedium}
          tone="red"
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
        />
        <ScoreControl
          personLabel="娘"
          label="気分"
          value={condition.mood}
          onChange={(score) => update("mood", score)}
          icon={SunMedium}
          tone="daughter"
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
