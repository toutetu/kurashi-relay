import type { Task } from "../data";

const toneClasses: Record<Task["tone"], string> = {
  lav: "bg-[var(--osh-lav)]",
  peri: "bg-[var(--osh-peri)]",
  mint: "bg-[var(--osh-mint)]",
};

type TaskRowProps = {
  task: Task;
  onToggle: (id: string) => void;
  showPlusOne?: boolean;
};

export function TaskRow({ task, onToggle, showPlusOne = false }: TaskRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(task.id)}
      aria-pressed={task.done}
      aria-label={`${task.label}${task.done ? "（できた）" : "（まだ）"}`}
      className={`pressable relative flex w-full items-center gap-3 border-b border-[var(--osh-line)] px-1.5 py-2.5 text-left transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        task.done
          ? "bg-[var(--osh-violet-soft)]/40"
          : "bg-transparent hover:bg-[var(--osh-card2)]/60"
      }`}
    >
      {showPlusOne && (
        <span
          aria-hidden="true"
          className="osh-plus-one pointer-events-none absolute -top-1 right-10 text-lg font-black text-[var(--osh-rose)]"
        >
          +1
        </span>
      )}
      <span
        className={`grid size-[38px] shrink-0 place-items-center rounded-xl text-[19px] ${toneClasses[task.tone]} ${
          task.done ? "outline-2 outline-[var(--osh-rose-soft)]" : ""
        }`}
        aria-hidden="true"
      >
        {task.emoji}
      </span>
      <span
        className={`flex-1 text-[13.5px] font-bold leading-snug ${
          task.done
            ? "text-[var(--osh-violet-deep)]"
            : "text-[var(--osh-ink-faint)]"
        }`}
      >
        {task.label}
      </span>
      <span
        className={`grid size-[27px] shrink-0 place-items-center rounded-full border-2 text-[13px] font-black ${
          task.done
            ? "border-[var(--osh-rose)] bg-[var(--osh-rose)] text-white"
            : "border-[var(--osh-line2)] bg-[var(--osh-card)] text-transparent"
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
    </button>
  );
}
