import {
  AlarmClock,
  Clock3,
  Gamepad2,
  ListChecks,
} from "lucide-react";
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
  color: string;
}> = [
  {
    key: "sleepMinutes",
    label: "睡眠",
    color: "var(--balance-sleep)",
  },
  {
    key: "waitingMinutes",
    label: "待機",
    color: "var(--balance-waiting)",
  },
  {
    key: "activityMinutes",
    label: "活動",
    color: "var(--balance-activity)",
  },
  {
    key: "recoveryMinutes",
    label: "回復",
    color: "var(--balance-recovery)",
  },
];

export function TimeBalanceCard({ balance }: { balance: TimeBalance }) {
  const total = Object.values(balance).reduce((sum, value) => sum + value, 0);
  const ariaLabel = `時間の内訳: ${balanceItems
    .map(({ key, label }) => `${label}${formatMinutes(balance[key])}`)
    .join("、")}`;

  return (
    <DashboardCard
      title="時間の内訳"
      icon={Clock3}
      tone="yellow"
      density="compact"
    >
      <div
        role="img"
        aria-label={ariaLabel}
        className="mb-2.5 flex h-4 gap-0.5 overflow-hidden rounded-full"
      >
        {balanceItems.map(({ key, color }) => {
          const percentage =
            total > 0
              ? Math.max(6, Math.round((balance[key] / total) * 100))
              : 0;
          return (
            <span
              key={key}
              className="block h-full rounded-sm"
              style={{
                width: `${percentage}%`,
                background: color,
              }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {balanceItems.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="font-semibold text-[var(--muted)]">{label}</span>
            <span className="ml-auto font-extrabold tabular-nums text-[var(--ink)]">
              {formatMinutes(balance[key])}
            </span>
          </span>
        ))}
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
