import { Undo2 } from "lucide-react";

type KoekakeUndoToastProps = {
  taskName: string;
  onUndo: () => void;
};

export function KoekakeUndoToast({ taskName, onUndo }: KoekakeUndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-22 left-1/2 z-50 flex w-[min(92vw,28rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/95 px-3 py-2.5 text-sm text-[var(--muted-text)] shadow-md backdrop-blur-sm xl:bottom-7"
    >
      <span className="truncate">{taskName}の声かけを記録しました</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--faint)] transition hover:bg-[var(--mother-blue-soft)] hover:text-[var(--mother-blue-strong)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <Undo2 aria-hidden="true" size={14} />
        とりけす
      </button>
    </div>
  );
}
