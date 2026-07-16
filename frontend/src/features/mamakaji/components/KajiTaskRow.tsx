import type { KajiTask } from "../data";

const toneClasses: Record<KajiTask["tone"], string> = {
  rasp: "bg-[var(--mkj-rasp-soft)]",
  cara: "bg-[var(--mkj-caramel-soft)]",
  sage: "bg-[var(--mkj-sage-soft)]",
  plum: "bg-[var(--mkj-plum-soft)]",
};

type KajiTaskRowProps = {
  task: KajiTask;
  onToggle: (id: string) => void;
  showPlusOne?: boolean;
};

export function KajiTaskRow({
  task,
  onToggle,
  showPlusOne = false,
}: KajiTaskRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(task.id)}
      aria-pressed={task.done}
      aria-label={`${task.label}${task.done ? "（できた）" : "（まだ）"}`}
      className={`pressable relative flex w-full items-center gap-3 border-b border-[var(--mkj-line)] px-1.5 py-2.5 text-left transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        task.done
          ? "bg-[var(--mkj-rasp-soft)]/40"
          : "bg-transparent hover:bg-[var(--mkj-card2)]/60"
      }`}
    >
      {showPlusOne && (
        <span
          aria-hidden="true"
          className="mkj-plus-one pointer-events-none absolute -top-1 right-10 text-lg font-black text-[var(--mkj-rasp)]"
        >
          +1
        </span>
      )}
      <span
        className={`grid size-[38px] shrink-0 place-items-center rounded-xl text-[19px] ${toneClasses[task.tone]} ${
          task.done ? "outline-2 outline-[var(--mkj-rasp-soft)]" : ""
        }`}
        aria-hidden="true"
      >
        {task.emoji}
      </span>
      <span
        className={`flex-1 text-[13.5px] font-bold leading-snug ${
          task.done
            ? "text-[var(--mkj-rasp-deep)]"
            : "text-[var(--mkj-ink)]"
        }`}
      >
        {task.label}
      </span>
      <span
        className={`grid size-[27px] shrink-0 place-items-center rounded-full border-2 text-[13px] font-black ${
          task.done
            ? "border-[var(--mkj-rasp)] bg-[var(--mkj-rasp)] text-white"
            : "border-[var(--mkj-line2)] bg-[var(--mkj-card)] text-transparent"
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
    </button>
  );
}
