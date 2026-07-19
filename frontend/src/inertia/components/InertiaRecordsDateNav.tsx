import { router } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, isTokyoDateAfter, shiftTokyoDate } from "@/utils/date";

type InertiaRecordsDateNavProps = {
  date: string;
  today: string;
  recordsPath: string;
};

export function InertiaRecordsDateNav({
  date,
  today,
  recordsPath,
}: InertiaRecordsDateNavProps) {
  const isToday = date === today;
  const canGoNext = !isTokyoDateAfter(shiftTokyoDate(date, 1), today);

  const visitDate = (nextDate: string) => {
    router.get(
      recordsPath,
      { date: nextDate },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      },
    );
  };

  return (
    <nav
      aria-label="日付の選択"
      className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center"
    >
      <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[var(--card-neutral-border)] bg-white px-2 py-2 shadow-sm sm:max-w-md">
        <button
          type="button"
          onClick={() => visitDate(shiftTokyoDate(date, -1))}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-sm font-bold text-[var(--mother-blue-strong)] hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--mother-blue)]"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          <span className="sr-only sm:not-sr-only">前の日</span>
        </button>
        <p className="text-center text-sm font-black text-[var(--text)] sm:text-base">
          {formatDate(date)}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!canGoNext) return;
            visitDate(shiftTokyoDate(date, 1));
          }}
          disabled={!canGoNext}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-sm font-bold text-[var(--mother-blue-strong)] hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--mother-blue)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="sr-only sm:not-sr-only">次の日</span>
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
      {!isToday && (
        <button
          type="button"
          onClick={() => visitDate(today)}
          className="text-sm font-bold text-[var(--mother-blue-strong)] underline underline-offset-4 hover:text-[var(--mother-blue)]"
        >
          きょうへもどる
        </button>
      )}
    </nav>
  );
}
