import {
  Activity,
  AlarmClock,
  Clock3,
  Gamepad2,
  Heart,
  ListChecks,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import {
  EmptyState,
  MetricTile,
  SectionLink,
} from "../../../components/ui/DashboardPrimitives";
import type {
  ActionItem,
  LastWarProgress,
  ScheduleImpactSummary,
  TimeBalance,
} from "../../../types/dashboard";
import { formatDateTime, formatMinutes } from "../../../utils/date";

const balanceItems: Array<{
  key: keyof TimeBalance;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    key: "sleepMinutes",
    label: "睡眠",
    icon: Moon,
    color: "bg-[var(--mother-blue)]",
  },
  {
    key: "waitingMinutes",
    label: "待機",
    icon: Clock3,
    color: "bg-[var(--mother-yellow)]",
  },
  {
    key: "activityMinutes",
    label: "活動",
    icon: Activity,
    color: "bg-[var(--mother-red)]",
  },
  {
    key: "recoveryMinutes",
    label: "回復",
    icon: Heart,
    color: "bg-[var(--daughter-purple)]",
  },
];

export function TimeBalanceCard({ balance }: { balance: TimeBalance }) {
  const total = Object.values(balance).reduce((sum, value) => sum + value, 0);
  return (
    <DashboardCard
      title="時間の内訳"
      icon={Clock3}
      tone="yellow"
      density="compact"
    >
      <dl className="grid grid-cols-2 gap-2">
        {balanceItems.map(({ key, label, icon: Icon }) => {
          const value = balance[key];
          return (
            <MetricTile
              key={key}
              label={label}
              value={
                <span className="flex items-center gap-1">
                  <Icon aria-hidden="true" size={14} />
                  {formatMinutes(value)}
                </span>
              }
              className="relative overflow-hidden"
            />
          );
        })}
      </dl>
      <div className="mt-2 grid grid-cols-4 gap-1" aria-label="時間の内訳">
        {balanceItems.map(({ key, label, color }) => {
          const percentage =
            total > 0
              ? Math.max(6, Math.round((balance[key] / total) * 100))
              : 0;
          return (
            <span
              key={key}
              aria-label={`${label} ${percentage}%`}
              className={`h-2 rounded-full ${color}`}
              style={{ flexBasis: `${percentage}%` }}
            />
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
  const metrics = [
    ["予定どおり", impact.onScheduleCount],
    ["遅れ", impact.delayedCount],
    ["中断・中止", impact.interruptedCount + impact.cancelledCount],
  ] as const;
  return (
    <DashboardCard
      title="予定への影響"
      icon={AlarmClock}
      tone="red"
      density="compact"
      action={<SectionLink to="/schedule-comparison">詳しく見る</SectionLink>}
    >
      <div className="grid grid-cols-3 gap-2">
        {metrics.map(([label, count]) => (
          <MetricTile
            key={label}
            label={label}
            value={count}
            className="text-center"
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-2 text-sm">
        <span className="font-bold text-[var(--muted-text)]">失われた時間</span>
        <strong className="text-[var(--mother-red-strong)]">
          {formatMinutes(impact.lostMinutes)}
        </strong>
      </div>
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
      title="対応事項"
      icon={ListChecks}
      tone="neutral"
      density="compact"
      action={<SectionLink to="/support">詳しく見る</SectionLink>}
    >
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.slice(0, 2).map((item) => (
            <li
              key={item.id}
              className="flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--page-background)] px-2.5 py-2"
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs font-black ${item.priority === "high" ? "bg-[var(--mother-red-soft)] text-[var(--mother-red-strong)]" : "bg-[var(--mother-yellow-soft)] text-[var(--mother-yellow-strong)]"}`}
              >
                {priorityLabels[item.priority]}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 block text-sm font-bold leading-snug text-[var(--text)]">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-[var(--muted-text)]">
                  {formatDateTime(item.dueAt)} ・{" "}
                  {actionStatusLabels[item.status] ?? item.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>対応事項はありません。</EmptyState>
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
      density="compact"
      action={<SectionLink to="/records">詳しく見る</SectionLink>}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[var(--muted-text)]">
          今日の進捗
        </span>
        <strong className="text-sm text-[var(--mother-blue-strong)]">
          {progress.completedCount} / {progress.totalCount} 完了
        </strong>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--mother-blue)] to-[var(--daughter-purple)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MetricTile
          label="プレイ時間"
          value={formatMinutes(progress.playMinutes)}
        />
        <MetricTile label="回復評価" value={`${progress.recoveryEffect} / 5`} />
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-[var(--muted-text)]">
        {progress.plannedTasks.join("・")}
      </p>
    </DashboardCard>
  );
}
