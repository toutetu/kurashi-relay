import { ClipboardPenLine, LayoutList } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { MemberRecordsSection } from "../features/records/components/MemberRecordsSection";
import { RecordsDateNav } from "../features/records/components/RecordsDateNav";
import { RecordsDetailSheet } from "../features/records/components/RecordsDetailSheet";
import {
  getTokyoToday,
  isTokyoDateAfter,
  shiftTokyoDate,
} from "../utils/date";

export function RecordsPage() {
  const today = getTokyoToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [detailOpen, setDetailOpen] = useState(false);
  const isToday = selectedDate === today;
  const canGoNext = !isTokyoDateAfter(shiftTokyoDate(selectedDate, 1), today);

  return (
    <div className="mx-auto max-w-2xl md:max-w-4xl">
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
          <ClipboardPenLine aria-hidden="true" size={17} />
          きろくを見る
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          この日のきろく
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
          むすめとママが、その日に何を何回やったかを見られます。
        </p>
      </div>

      <RecordsDateNav
        date={selectedDate}
        isToday={isToday}
        canGoNext={canGoNext}
        onPrevious={() => setSelectedDate((current) => shiftTokyoDate(current, -1))}
        onNext={() => {
          if (!canGoNext) return;
          setSelectedDate((current) => shiftTokyoDate(current, 1));
        }}
        onBackToToday={() => setSelectedDate(today)}
      />

      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          tone="blue"
          icon={LayoutList}
          onClick={() => setDetailOpen(true)}
        >
          詳しく
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="min-w-0 order-2 md:order-1">
          <MemberRecordsSection
            member="mother"
            date={selectedDate}
            title="ママ の きろく"
          />
        </div>
        <div className="min-w-0 order-1 md:order-2">
          <MemberRecordsSection
            member="child"
            date={selectedDate}
            title="むすめ の きろく"
          />
        </div>
      </div>

      {detailOpen && (
        <RecordsDetailSheet
          date={selectedDate}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}
