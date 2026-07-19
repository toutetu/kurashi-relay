import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { formatDate } from "../../../utils/date";
import { MemberTimelineSection } from "./MemberTimelineSection";

type RecordsDetailSheetProps = {
  date: string;
  scope?: "child" | "all";
  onClose: () => void;
};

export function RecordsDetailSheet({
  date,
  scope = "all",
  onClose,
}: RecordsDetailSheetProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isChildOnly = scope === "child";

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--text)]/25 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="詳細を閉じる"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,48rem)] w-full max-w-3xl flex-col rounded-t-[1.5rem] border border-[var(--border)] bg-white shadow-xl sm:rounded-[1.5rem]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div>
            <p className="text-sm font-bold text-[var(--mother-blue-strong)]">
              {isChildOnly ? "この日のきろく" : "この日の記録"}
            </p>
            <h2
              id={titleId}
              className="mt-0.5 text-lg font-black tracking-tight text-[var(--text)]"
            >
              {formatDate(date)}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-text)] sm:text-sm">
              {isChildOnly
                ? "むすめのやったことと時刻を古い順に並べています"
                : "左がママ、右がむすめ。やったことと時刻を古い順に並べています"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="pressable grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="overflow-y-auto px-3 py-4 sm:px-5">
          {isChildOnly ? (
            <MemberTimelineSection
              title="むすめ の きろく"
              date={date}
              member="child"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <MemberTimelineSection
                title="ママ の きろく"
                date={date}
                member="mother"
              />
              <MemberTimelineSection
                title="むすめ の きろく"
                date={date}
                member="child"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
