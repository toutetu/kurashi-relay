import { Undo2 } from "lucide-react";

type KoekakeUndoToastProps = {
  taskName: string;
  onUndo: () => void;
  errorMessage?: string | null;
  isUndoing?: boolean;
  onRetry?: () => void;
};

export function KoekakeUndoToast({
  taskName,
  onUndo,
  errorMessage = null,
  isUndoing = false,
  onRetry,
}: KoekakeUndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-22 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-white/95 px-3 py-2.5 text-sm text-[var(--muted-text)] shadow-md backdrop-blur-sm xl:bottom-7"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">
          {isUndoing
            ? `${taskName}の声かけを取り消し中…`
            : `${taskName}の声かけを記録しました`}
        </span>
        {!errorMessage && (
          <button
            type="button"
            onClick={onUndo}
            disabled={isUndoing}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--faint)] transition hover:bg-[var(--mother-blue-soft)] hover:text-[var(--mother-blue-strong)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60"
          >
            <Undo2 aria-hidden="true" size={14} />
            {isUndoing ? "取消中…" : "とりけす"}
          </button>
        )}
      </div>
      {errorMessage && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p role="alert" className="text-xs text-[var(--mother-red-strong)]">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isUndoing}
              className="rounded-lg px-2 py-1 text-xs font-bold text-[var(--mother-blue-strong)] transition hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60"
            >
              {isUndoing ? "取消中…" : "再試行"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
