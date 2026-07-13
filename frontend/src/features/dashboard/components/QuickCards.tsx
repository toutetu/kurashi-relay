import {
  Activity,
  BadgeCheck,
  Bell,
  Bike,
  BriefcaseBusiness,
  CirclePlay,
  Clock3,
  Gamepad2,
  Heart,
  House,
  Phone,
  Sparkles,
  TimerReset,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DashboardCard } from "../../../components/ui/DashboardCard";
import { Button } from "../../../components/ui/Button";
import {
  EmptyState,
  QuickActionButton,
} from "../../../components/ui/DashboardPrimitives";
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
  tone: "blue" | "yellow" | "red";
}> = [
  {
    category: "work_preparation",
    label: "就労準備",
    icon: BriefcaseBusiness,
    tone: "blue",
  },
  { category: "housework", label: "家事", icon: House, tone: "yellow" },
  {
    category: "school_support",
    label: "登校支援",
    icon: Sparkles,
    tone: "red",
  },
  { category: "waiting", label: "待機", icon: Clock3, tone: "yellow" },
  { category: "recovery", label: "回復・休息", icon: Heart, tone: "red" },
  { category: "last_war", label: "ラストウォー", icon: Gamepad2, tone: "blue" },
];

const quickLogIcons: Record<QuickLogType, LucideIcon> = {
  wake_prompt: Bell,
  change_clothes_prompt: Sparkles,
  school_contact: Phone,
  stomachache_support: Activity,
  transport: Bike,
  school_handoff: BadgeCheck,
};

export function QuickStartCard({
  onStart,
}: {
  onStart: (activity: LocalActivity) => void;
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
      icon={CirclePlay}
      tone="blue"
      density="compact"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {quickActivities.map(({ category, label, icon, tone }) => (
          <QuickActionButton
            key={category}
            icon={icon}
            label={label}
            tone={tone}
            onClick={() => startActivity(category, label)}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--muted-text)]">
        この画面での変更は、まだサーバーには保存されません。
      </p>
    </DashboardCard>
  );
}

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
        density="compact"
      >
        {logs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
            {logs.map((log) => (
              <QuickActionButton
                key={log.type}
                icon={quickLogIcons[log.type]}
                label={log.label}
                tone="yellow"
                onClick={() => addLog(log)}
                ariaLabel={`${log.label}を記録。現在${log.count}件`}
                detail={
                  <span className="ml-auto rounded-full bg-white/80 px-1.5 py-0.5 text-xs font-black">
                    {log.count}件
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState>記録できる項目はありません。</EmptyState>
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
            onClick={undo}
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
