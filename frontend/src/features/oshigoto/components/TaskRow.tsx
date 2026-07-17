import type { Task } from "../data";

const toneClasses: Record<Task["tone"], string> = {
  lav: "bg-[var(--osh-lav)]",
  peri: "bg-[var(--osh-peri)]",
  mint: "bg-[var(--osh-mint)]",
};

type TaskRowProps = {
  task: Task;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  showPlusOne?: boolean;
};

export function TaskRow({
  task,
  onIncrement,
  onDecrement,
  showPlusOne = false,
}: TaskRowProps) {
  const hasCount = task.count > 0;

  return (
    <div
      className={`flex w-full items-stretch gap-1 border-b border-[var(--osh-line)] ${
        hasCount
          ? "bg-[var(--osh-violet-soft)]/40"
          : "bg-transparent"
      }`}
    >
      <button
        type="button"
        onClick={() => onIncrement(task.id)}
        aria-label={`${task.label}、きょう${task.count}回`}
        className={`pressable relative flex min-h-11 flex-1 items-center gap-3 px-1.5 py-2.5 text-left transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
          hasCount
            ? ""
            : "hover:bg-[var(--osh-card2)]/60"
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
            hasCount ? "outline-2 outline-[var(--osh-rose-soft)]" : ""
          }`}
          aria-hidden="true"
        >
          {task.emoji}
        </span>
        <span
          className={`flex-1 text-[13.5px] font-bold leading-snug ${
            hasCount
              ? "text-[var(--osh-violet-deep)]"
              : "text-[var(--osh-ink-faint)]"
          }`}
        >
          {task.label}
        </span>
        <span
          className={`grid min-w-[27px] shrink-0 place-items-center rounded-full border-2 px-1 text-[13px] font-black ${
            hasCount
              ? "border-[var(--osh-rose)] bg-[var(--osh-rose)] text-white"
              : "size-[27px] border-[var(--osh-line2)] bg-[var(--osh-card)] text-transparent"
          }`}
          aria-hidden="true"
        >
          {hasCount ? task.count : ""}
        </span>
      </button>
      {hasCount && (
        <button
          type="button"
          onClick={() => onDecrement(task.id)}
          aria-label={`${task.label}を1回とりけす`}
          className="pressable my-1 grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--osh-line2)] bg-[var(--osh-card)] text-lg font-black text-[var(--osh-ink-soft)] transition hover:bg-[var(--osh-card2)] active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          −
        </button>
      )}
    </div>
  );
}
