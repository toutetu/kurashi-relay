import type { ApiTask } from "../../../api/schemas/oshigotoSchema";

type RecordTaskRowProps = {
  task: ApiTask;
};

export function RecordTaskRow({ task }: RecordTaskRowProps) {
  const isEmpty = task.count === 0;

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-[var(--card-neutral-border)] px-4 py-3 last:border-b-0 ${
        isEmpty ? "text-[var(--muted-text)]" : "text-[var(--text)]"
      }`}
    >
      <span className={`text-sm ${isEmpty ? "font-medium" : "font-bold"}`}>
        {task.title}
      </span>
      <span
        className={`shrink-0 text-sm tabular-nums ${
          isEmpty ? "font-medium opacity-70" : "font-black"
        }`}
        aria-label={`${task.count}回`}
      >
        ×{task.count}
      </span>
    </div>
  );
}
