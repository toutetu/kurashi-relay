import type { ApiTask } from "../../../api/schemas/oshigotoSchema";

type RecordTaskRowProps = {
  task: ApiTask;
  compact?: boolean;
};

export function RecordTaskRow({ task, compact = false }: RecordTaskRowProps) {
  const isEmpty = task.count === 0;

  return (
    <div
      className={`flex items-center justify-between border-b border-[var(--card-neutral-border)] last:border-b-0 ${
        compact ? "gap-2 px-2.5 py-2.5" : "gap-3 px-4 py-3"
      } ${isEmpty ? "text-[var(--muted-text)]" : "text-[var(--text)]"}`}
    >
      <span
        className={`min-w-0 leading-snug ${
          compact ? "text-xs" : "text-sm"
        } ${isEmpty ? "font-medium" : "font-bold"}`}
      >
        {task.title}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          compact ? "text-xs" : "text-sm"
        } ${isEmpty ? "font-medium opacity-70" : "font-black"}`}
        aria-label={`${task.count}回`}
      >
        ×{task.count}
      </span>
    </div>
  );
}
