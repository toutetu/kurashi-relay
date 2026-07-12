import {
  Activity,
  AlarmClock,
  ArrowRightLeft,
  BadgeCheck,
  Bell,
  Bike,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  CirclePlay,
  CircleStop,
  Clock3,
  Gamepad2,
  Heart,
  House,
  ListChecks,
  Moon,
  Phone,
  School,
  Sparkles,
  SunMedium,
  TimerReset,
  Undo2,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import type {
  ActionItem,
  ActivityCategory,
  ConditionState,
  Conditions,
  LastWarProgress,
  QuickLog,
  QuickLogType,
  ScheduleImpactSummary,
  SchedulePlan,
  Score,
  TimeBalance,
  ChildStrategy,
} from "../../../types/dashboard";
import type { LocalActivity } from "../../../types/local";
import {
  formatDateTime,
  formatMinutes,
  formatTime,
  formatTimeRange,
} from "../../../utils/date";

const categoryLabels: Record<ActivityCategory, string> = {
  work_preparation: "就労準備",
  housework: "家事",
  school_support: "登校支援",
  waiting: "待機",
  recovery: "回復・休息",
  last_war: "ラストウォー",
};

const statusLabels = {
  idle: "待機中",
  running: "進行中",
  paused: "一時停止中",
  completed: "終了",
} as const;

const quickActivities: Array<{
  category: ActivityCategory;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    category: "work_preparation",
    label: "就労準備",
    icon: BriefcaseBusiness,
    color: "blue",
  },
  { category: "housework", label: "家事", icon: House, color: "yellow" },
  { category: "school_support", label: "登校支援", icon: School, color: "red" },
  { category: "waiting", label: "待機", icon: Clock3, color: "yellow" },
  { category: "recovery", label: "回復・休息", icon: Heart, color: "red" },
  {
    category: "last_war",
    label: "ラストウォー",
    icon: Gamepad2,
    color: "blue",
  },
];

const quickActivityColors: Record<string, string> = {
  blue: "border-[#bcdcf7] bg-[#edf6ff] text-[#236da8] hover:bg-[#d8ecff]",
  yellow: "border-[#ead797] bg-[#fff8db] text-[#77550b] hover:bg-[#fff0b8]",
  red: "border-[#f2b6b8] bg-[#fff0f1] text-[#a4373d] hover:bg-[#ffe0e1]",
};

function calculateElapsedMinutes(activity: LocalActivity, currentTime: number) {
  const effectiveEnd = activity.completedAt
    ? new Date(activity.completedAt).getTime()
    : activity.pausedAt
      ? new Date(activity.pausedAt).getTime()
      : currentTime;
  const activeMilliseconds =
    effectiveEnd -
    new Date(activity.startedAt).getTime() -
    activity.totalPausedMilliseconds;
  return Math.max(0, Math.floor(activeMilliseconds / 60_000));
}

function useElapsedMinutes(activity: LocalActivity | null) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const refresh = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    if (activity?.status !== "running") {
      return () => window.clearTimeout(refresh);
    }
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => {
      window.clearTimeout(refresh);
      window.clearInterval(timer);
    };
  }, [activity]);

  return activity ? calculateElapsedMinutes(activity, currentTime) : 0;
}

interface CurrentActivityCardProps {
  activity: LocalActivity | null;
  onChange: (activity: LocalActivity | null) => void;
}

export function CurrentActivityCard({
  activity,
  onChange,
}: CurrentActivityCardProps) {
  const elapsedMinutes = useElapsedMinutes(activity);

  const pause = () => {
    if (!activity || activity.status !== "running") return;
    onChange({
      ...activity,
      status: "paused",
      pausedAt: new Date().toISOString(),
    });
  };

  const resume = () => {
    if (!activity || activity.status !== "paused") return;
    const currentPause = activity.pausedAt
      ? Math.max(0, Date.now() - new Date(activity.pausedAt).getTime())
      : 0;
    onChange({
      ...activity,
      status: "running",
      pausedAt: null,
      completedAt: null,
      totalPausedMilliseconds: activity.totalPausedMilliseconds + currentPause,
    });
  };

  const complete = () => {
    if (!activity || activity.status === "completed") return;
    const now = new Date();
    const currentPause = activity.pausedAt
      ? Math.max(0, now.getTime() - new Date(activity.pausedAt).getTime())
      : 0;
    onChange({
      ...activity,
      status: "completed",
      pausedAt: null,
      completedAt: now.toISOString(),
      totalPausedMilliseconds: activity.totalPausedMilliseconds + currentPause,
    });
  };

  const goToQuickStart = () => {
    document
      .querySelector("#quick-start")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <DashboardCard
      title="現在の活動"
      icon={Activity}
      tone="red"
      className="md:col-span-2 xl:col-span-2"
    >
      {activity ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-black tracking-tight text-[#28334a]">
                {activity.title}
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#526078] shadow-sm">
                {categoryLabels[activity.category]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ffe0e1] px-3 py-1 text-xs font-bold text-[#a4373d]">
                <span
                  className={`size-2 rounded-full ${activity.status === "running" ? "animate-pulse bg-[#d6535b]" : "bg-[#8b93a1]"}`}
                />
                {statusLabels[activity.status]}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-3">
                <dt className="text-xs font-bold text-[#667085]">開始</dt>
                <dd className="mt-1 font-black">
                  {formatTime(activity.startedAt)}
                </dd>
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <dt className="text-xs font-bold text-[#667085]">経過時間</dt>
                <dd className="mt-1 font-black">
                  {formatMinutes(elapsedMinutes)}
                </dd>
              </div>
              <div className="col-span-2 rounded-xl bg-white/80 p-3 sm:col-span-1">
                <dt className="text-xs font-bold text-[#667085]">関連予定</dt>
                <dd className="mt-1 truncate font-bold">
                  {activity.relatedPlanTitle || "関連予定なし"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-68 lg:justify-end">
            {activity.status === "running" && (
              <button
                type="button"
                onClick={pause}
                className="action-button bg-white text-[#a4373d]"
              >
                <CirclePause aria-hidden="true" size={18} />
                一時停止
              </button>
            )}
            {activity.status === "paused" && (
              <button
                type="button"
                onClick={resume}
                className="action-button bg-white text-[#236da8]"
              >
                <CirclePlay aria-hidden="true" size={18} />
                再開
              </button>
            )}
            {activity.status !== "completed" && (
              <button
                type="button"
                onClick={complete}
                className="action-button bg-[#a4373d] text-white"
              >
                <CircleStop aria-hidden="true" size={18} />
                終了
              </button>
            )}
            <button
              type="button"
              onClick={goToQuickStart}
              className="action-button bg-white text-[#526078]"
            >
              <ArrowRightLeft aria-hidden="true" size={18} />
              切り替える
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#f2b6b8] bg-white/70 p-5 text-center">
          <p className="font-bold text-[#526078]">
            現在、進行中の活動はありません。
          </p>
          <button
            type="button"
            onClick={goToQuickStart}
            className="action-button mx-auto mt-4 bg-[#a4373d] text-white"
          >
            <CirclePlay aria-hidden="true" size={18} />
            活動を始める
          </button>
        </div>
      )}
    </DashboardCard>
  );
}

interface QuickStartCardProps {
  onStart: (activity: LocalActivity) => void;
}

export function QuickStartCard({ onStart }: QuickStartCardProps) {
  const startActivity = (category: ActivityCategory, label: string) => {
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
  };

  return (
    <DashboardCard
      id="quick-start"
      title="クイック活動開始"
      icon={CirclePlay}
      tone="blue"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
        {quickActivities.map(({ category, label, icon: Icon, color }) => (
          <button
            type="button"
            key={category}
            onClick={() => startActivity(category, label)}
            className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] ${quickActivityColors[color]}`}
          >
            <Icon aria-hidden="true" size={23} />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#667085]">
        この画面での変更は、まだサーバーには保存されません。
      </p>
    </DashboardCard>
  );
}

const quickLogIcons: Record<QuickLogType, LucideIcon> = {
  wake_prompt: Bell,
  change_clothes_prompt: Sparkles,
  school_contact: Phone,
  stomachache_support: Activity,
  transport: Bike,
  school_handoff: BadgeCheck,
};

export function QuickLogsCard({ initialLogs }: { initialLogs: QuickLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [lastAction, setLastAction] = useState<{
    type: QuickLogType;
    label: string;
  } | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    },
    [],
  );

  const addLog = (log: QuickLog) => {
    setLogs((current) =>
      current.map((item) =>
        item.type === log.type ? { ...item, count: item.count + 1 } : item,
      ),
    );
    setLastAction({ type: log.type, label: log.label });
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setLastAction(null), 5_000);
  };

  const undo = () => {
    if (!lastAction) return;
    setLogs((current) =>
      current.map((item) =>
        item.type === lastAction.type
          ? { ...item, count: Math.max(0, item.count - 1) }
          : item,
      ),
    );
    setLastAction(null);
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  };

  return (
    <>
      <DashboardCard
        title="クイック記録"
        icon={TimerReset}
        tone="yellow"
        className="md:col-span-2 xl:col-span-1"
      >
        {logs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-2">
            {logs.map((log) => {
              const Icon = quickLogIcons[log.type];
              return (
                <button
                  type="button"
                  key={log.type}
                  onClick={() => addLog(log)}
                  aria-label={`${log.label}を記録。現在${log.count}件`}
                  className="group relative flex min-h-22 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#ead797] bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3]"
                >
                  <Icon
                    aria-hidden="true"
                    size={22}
                    className="text-[#8a6411]"
                  />
                  <span className="text-sm font-bold text-[#28334a]">
                    {log.label}
                  </span>
                  <span className="rounded-full bg-[#fff8db] px-2 py-0.5 text-xs font-black text-[#77550b]">
                    {log.count}件
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-white/75 p-4 text-sm text-[#667085]">
            記録できる項目はありません。
          </p>
        )}
      </DashboardCard>

      {lastAction && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-22 left-1/2 z-50 flex w-[min(92vw,30rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-[#28334a] px-4 py-3 text-sm text-white shadow-xl xl:bottom-7"
        >
          <span className="font-bold">{lastAction.label}を1件記録しました</span>
          <button
            type="button"
            onClick={undo}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 font-bold text-[#28334a] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f3c85b]"
          >
            <Undo2 aria-hidden="true" size={17} />
            取り消す
          </button>
        </div>
      )}
    </>
  );
}

export function NextPlansCard({ plans }: { plans: SchedulePlan[] }) {
  return (
    <DashboardCard
      title="次の予定"
      icon={CalendarDays}
      tone="blue"
      action={
        <Link
          to="/schedule"
          className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-[#236da8] hover:bg-white hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3]"
        >
          すべて見る
        </Link>
      }
    >
      {plans.length > 0 ? (
        <ol className="space-y-2">
          {plans.slice(0, 4).map((plan) => (
            <li
              key={plan.id}
              className="flex items-center gap-3 rounded-2xl border border-[#d8ecff] bg-white/85 p-3"
            >
              <time className="w-16 shrink-0 text-center text-sm font-black text-[#236da8]">
                {formatTime(plan.startAt)}
              </time>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-[#28334a]">
                  {plan.title}
                </span>
                <span className="mt-0.5 block text-xs text-[#667085]">
                  {formatTimeRange(plan.startAt, plan.endAt)}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                size={18}
                className="shrink-0 text-[#8b93a1]"
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#bcdcf7] bg-white/70 p-5 text-center">
          <p className="font-bold text-[#526078]">次の予定はありません</p>
          <p className="mt-1 text-sm text-[#667085]">
            予定が登録されると、ここに表示されます。
          </p>
        </div>
      )}
    </DashboardCard>
  );
}

const scoreValues = [1, 2, 3, 4, 5] as const;

function ScoreControl({
  person,
  label,
  value,
  onChange,
  icon: Icon,
}: {
  person: string;
  label: string;
  value: Score;
  onChange: (score: Score) => void;
  icon: LucideIcon;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#526078]">
        <Icon aria-hidden="true" size={16} />
        {label}
      </legend>
      <div className="grid grid-cols-5 gap-1.5">
        {scoreValues.map((score) => (
          <button
            type="button"
            key={score}
            aria-pressed={score === value}
            aria-label={`${person}の${label}を${score}にする`}
            onClick={() => onChange(score)}
            className={`grid min-h-11 place-items-center rounded-xl border text-sm font-black transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-[#68a7e3] ${
              score === value
                ? "border-[#a4373d] bg-[#a4373d] text-white shadow-sm"
                : "border-slate-200 bg-white text-[#526078] hover:border-[#ef767a]"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const sourceLabels: Record<ConditionState["inputSource"], string> = {
  self: "本人入力",
  guardian_confirmed: "母が確認",
  guardian_observation: "母の観察",
};

const daughterSourceOptions: Array<{
  value: ConditionState["inputSource"];
  label: string;
}> = [
  { value: "self", label: "娘本人" },
  { value: "guardian_confirmed", label: "母が確認" },
  { value: "guardian_observation", label: "母の観察" },
];

export function ConditionsCard({
  initialConditions,
}: {
  initialConditions: Conditions;
}) {
  const [conditions, setConditions] = useState(initialConditions);

  const update = (
    person: keyof Conditions,
    key: "physical" | "mood",
    score: Score,
  ) => {
    setConditions((current) => ({
      ...current,
      [person]: { ...current[person], [key]: score },
    }));
  };

  const updateDaughterSource = (inputSource: ConditionState["inputSource"]) => {
    setConditions((current) => ({
      ...current,
      daughter: { ...current.daughter, inputSource },
    }));
  };

  return (
    <DashboardCard
      title="母・娘の体調と気分"
      icon={Heart}
      tone="red"
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(["mother", "daughter"] as const).map((person) => {
          const label = person === "mother" ? "母" : "娘";
          const condition = conditions[person];
          return (
            <section
              key={person}
              aria-label={`${label}の状態`}
              className="rounded-2xl border border-[#f2d0d2] bg-white/80 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="font-black text-[#28334a]">{label}</h3>
                <span className="rounded-full bg-[#fff0f1] px-2.5 py-1 text-xs font-bold text-[#a4373d]">
                  {sourceLabels[condition.inputSource]}
                </span>
              </div>
              <div className="space-y-4">
                <ScoreControl
                  person={label}
                  label="体調"
                  value={condition.physical}
                  onChange={(score) => update(person, "physical", score)}
                  icon={Heart}
                />
                <ScoreControl
                  person={label}
                  label="気分"
                  value={condition.mood}
                  onChange={(score) => update(person, "mood", score)}
                  icon={SunMedium}
                />
                {person === "daughter" && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold text-[#526078]">
                      入力者区分
                    </legend>
                    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-1 lg:grid-cols-3">
                      {daughterSourceOptions.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          aria-pressed={condition.inputSource === option.value}
                          aria-label={`娘の入力者区分を${option.label}にする`}
                          onClick={() => updateDaughterSource(option.value)}
                          className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-[#68a7e3] ${
                            condition.inputSource === option.value
                              ? "border-[#236da8] bg-[#236da8] text-white"
                              : "border-slate-200 bg-white text-[#526078] hover:border-[#68a7e3]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[#667085]">
        1（低め）〜5（良い）の数値と選択状態を併記しています。
      </p>
    </DashboardCard>
  );
}

const confidenceLabels: Record<string, string> = {
  confident: "できそう",
  slightly_anxious: "少し不安",
  anxious: "かなり不安",
  unknown: "分からない",
};

export function ChildStrategyCard({ strategy }: { strategy: ChildStrategy }) {
  return (
    <DashboardCard
      title="娘の今日の作戦"
      icon={WandSparkles}
      tone="daughter"
      className="md:col-span-2 xl:col-span-1"
    >
      <div
        className="mb-4 flex justify-end gap-1 text-[#8265c7]"
        aria-hidden="true"
      >
        <Sparkles size={15} />
        <Moon size={17} />
        <Sparkles size={12} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3.5">
          <dt className="text-xs font-black text-[#684baa]">
            今日どうしたい？
          </dt>
          <dd className="mt-1.5 font-bold leading-relaxed text-[#312a58]">
            {strategy.desiredOutcome || "まだ決めていません"}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3.5">
          <dt className="text-xs font-black text-[#684baa]">最初に試すこと</dt>
          <dd className="mt-1.5 font-bold leading-relaxed text-[#312a58]">
            {strategy.firstStep || "まだ決めていません"}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3.5 sm:col-span-2 xl:col-span-1">
          <dt className="text-xs font-black text-[#684baa]">
            大人にしてほしいこと
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-[#312a58]">
            {strategy.requestedSupports.length > 0
              ? strategy.requestedSupports.join("・")
              : "特にありません"}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3.5 sm:col-span-2 xl:col-span-1">
          <dt className="text-xs font-black text-[#684baa]">
            難しい場合の別案
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-[#312a58]">
            {strategy.fallbackPlans.length > 0
              ? strategy.fallbackPlans.join("・")
              : "あとで一緒に考えます"}
          </dd>
        </div>
      </dl>
      <div className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#8265c7] px-4 py-2 text-sm font-black text-white">
        <Heart aria-hidden="true" size={17} />
        自信の程度：
        {confidenceLabels[strategy.confidence] ?? strategy.confidence}
      </div>
    </DashboardCard>
  );
}

const balanceItems: Array<{
  key: keyof TimeBalance;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  { key: "sleepMinutes", label: "睡眠", icon: Moon, color: "bg-[#68a7e3]" },
  {
    key: "waitingMinutes",
    label: "待機・拘束",
    icon: Clock3,
    color: "bg-[#f3c85b]",
  },
  {
    key: "activityMinutes",
    label: "活動",
    icon: Activity,
    color: "bg-[#ef767a]",
  },
  { key: "recoveryMinutes", label: "回復", icon: Heart, color: "bg-[#8265c7]" },
];

export function TimeBalanceCard({ balance }: { balance: TimeBalance }) {
  const total = Object.values(balance).reduce((sum, value) => sum + value, 0);

  return (
    <DashboardCard title="時間のバランス" icon={Clock3} tone="yellow">
      <div className="space-y-3">
        {balanceItems.map(({ key, label, icon: Icon, color }) => {
          const value = balance[key];
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-bold text-[#526078]">
                  <Icon aria-hidden="true" size={16} />
                  {label}
                </span>
                <span className="font-black text-[#28334a]">
                  {formatMinutes(value)}
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-white"
                aria-label={`${label} ${percentage}%`}
              >
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

export function ImpactSummaryCard({
  impact,
}: {
  impact: ScheduleImpactSummary;
}) {
  const counts = [
    ["予定どおり", impact.onScheduleCount, "text-[#236da8]"],
    ["遅れ", impact.delayedCount, "text-[#a16a00]"],
    ["中断", impact.interruptedCount, "text-[#a4373d]"],
    ["中止", impact.cancelledCount, "text-[#a4373d]"],
    ["夜へ振替", impact.movedToNightCount, "text-[#684baa]"],
  ] as const;

  return (
    <DashboardCard title="予定への影響" icon={AlarmClock} tone="red">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3">
        {counts.map(([label, count, color]) => (
          <div key={label} className="rounded-xl bg-white/80 p-2.5 text-center">
            <span className={`block text-xl font-black ${color}`}>{count}</span>
            <span className="mt-0.5 block text-[0.7rem] font-bold text-[#667085]">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-white/85 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-[#526078]">失われた時間</span>
          <strong className="text-lg text-[#b84047]">
            {formatMinutes(impact.lostMinutes)}
          </strong>
        </div>
        {impact.mainCauses.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-[#526078]">
            {impact.mainCauses.map((cause) => (
              <li key={cause.label} className="flex justify-between gap-2">
                <span>{cause.label}</span>
                <span className="font-bold">
                  {formatMinutes(cause.minutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link
        to="/schedule-comparison"
        className="mt-3 inline-flex min-h-11 items-center gap-1 font-bold text-[#a4373d] hover:underline"
      >
        詳しく比較する
        <ChevronRight aria-hidden="true" size={17} />
      </Link>
    </DashboardCard>
  );
}

const priorityLabels: Record<ActionItem["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};
const actionStatusLabels: Record<string, string> = {
  not_started: "未着手",
  coordinating: "調整中",
  in_progress: "対応中",
  completed: "完了",
};

export function ActionItemsCard({ items }: { items: ActionItem[] }) {
  return (
    <DashboardCard
      title="次のアクション"
      icon={ListChecks}
      tone="white"
      className="md:col-span-2 xl:col-span-1"
    >
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-[#fffdf9] p-3.5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black ${item.priority === "high" ? "bg-[#ffe0e1] text-[#a4373d]" : item.priority === "medium" ? "bg-[#fff0b8] text-[#77550b]" : "bg-[#edf6ff] text-[#236da8]"}`}
                >
                  {priorityLabels[item.priority]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug text-[#28334a]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                    担当：{item.assignee} ・ 期限：{formatDateTime(item.dueAt)}{" "}
                    ・ {actionStatusLabels[item.status] ?? item.status}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
          <CheckCircle2 className="mx-auto text-[#68a7e3]" aria-hidden="true" />
          <p className="mt-2 font-bold text-[#526078]">
            次のアクションはありません
          </p>
        </div>
      )}
    </DashboardCard>
  );
}

export function LastWarCard({ progress }: { progress: LastWarProgress }) {
  const percentage =
    progress.totalCount > 0
      ? Math.round((progress.completedCount / progress.totalCount) * 100)
      : 0;
  return (
    <DashboardCard
      title="ラストウォー"
      icon={Gamepad2}
      tone="blue"
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-black text-[#28334a]">今日の進捗</p>
            <p className="text-sm font-bold text-[#236da8]">
              {progress.completedCount} / {progress.totalCount} 完了
            </p>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#68a7e3] to-[#8265c7]"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {progress.plannedTasks.map((task, index) => (
              <li
                key={task}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#526078]"
              >
                {index < progress.completedCount ? (
                  <CheckCircle2
                    aria-hidden="true"
                    size={15}
                    className="text-[#3d9b62]"
                  />
                ) : (
                  <span className="size-3.5 rounded-full border-2 border-[#b7c1cf]" />
                )}
                {task}
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:w-52">
          <div className="rounded-xl bg-white/80 p-3 text-center">
            <dt className="text-xs font-bold text-[#667085]">プレイ時間</dt>
            <dd className="mt-1 font-black text-[#28334a]">
              {formatMinutes(progress.playMinutes)}
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 p-3 text-center">
            <dt className="text-xs font-bold text-[#667085]">回復評価</dt>
            <dd className="mt-1 font-black text-[#28334a]">
              {progress.recoveryEffect} / 5
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-xs text-[#667085]">
        このカードは本人向けです。支援者向け資料には含めません。
      </p>
    </DashboardCard>
  );
}
