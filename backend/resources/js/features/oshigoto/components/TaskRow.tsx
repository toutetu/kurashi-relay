import { Plus } from "lucide-react";
import { useState } from "react";
import type { Task } from "../data";

type TaskRowProps = {
  task: Task;
  onIncrement: (id: string) => void;
};

export function TaskRow({ task, onIncrement }: TaskRowProps) {
  const [flyKey, setFlyKey] = useState(0);

  const handleClick = () => {
    onIncrement(task.id);
    setFlyKey((key) => key + 1);
  };

  return (
    <div className="border-b border-[var(--osh-line)] last:border-b-0">
      <button
        type="button"
        aria-label={`${task.label}を記録。きょう${task.count}件`}
        onClick={handleClick}
        className="pressable group relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2 py-1 text-left text-[13px] font-semibold text-[var(--osh-ink)] transition hover:bg-[color-mix(in_srgb,var(--osh-violet-soft)_65%,var(--osh-card))] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <span className="min-w-0 flex-1 truncate">{task.label}</span>
        <span
          className={`rounded-full px-2.5 text-xs font-black tabular-nums ${
            task.count === 0
              ? "bg-[var(--osh-card2)] text-[var(--osh-ink-faint)]"
              : "bg-[var(--osh-violet-soft)] text-[var(--osh-violet-deep)]"
          }`}
        >
          {task.count}件
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--osh-violet-soft)] text-[var(--osh-violet-deep)] transition group-hover:bg-[var(--osh-violet)] group-hover:text-white">
          <Plus aria-hidden="true" size={14} strokeWidth={2.4} />
        </span>
        {flyKey > 0 && (
          <span key={flyKey} className="fly [--fly-color:var(--osh-violet)]" aria-hidden="true">
            +1
          </span>
        )}
      </button>
    </div>
  );
}
