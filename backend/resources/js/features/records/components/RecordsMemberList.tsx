import type { ApiTask } from "../../../api/schemas/oshigotoSchema";
import { RecordTaskRow } from "./RecordTaskRow";

type RecordsMemberListProps = {
  tasks: ApiTask[];
  todayDoneCount: number;
  compact?: boolean;
};

export function RecordsMemberList({
  tasks,
  todayDoneCount,
  compact = false,
}: RecordsMemberListProps) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white shadow-sm">
      {tasks.map((task) => (
        <RecordTaskRow key={task.slug} task={task} compact={compact} />
      ))}
      <div
        className={`flex items-center justify-between border-t border-[var(--card-neutral-border)] bg-[var(--mother-blue-soft)]/35 ${
          compact ? "gap-2 px-2.5 py-2.5" : "gap-3 px-4 py-3"
        }`}
      >
        <span
          className={`font-bold text-[var(--text)] ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          この日ぜんぶで
        </span>
        <span
          className={`font-black tabular-nums text-[var(--mother-blue-strong)] ${
            compact ? "text-xs" : "text-sm"
          }`}
          aria-label={`合計${todayDoneCount}回`}
        >
          ×{todayDoneCount}
        </span>
      </div>
    </div>
  );
}
