import { ClipboardPenLine } from "lucide-react";
import { useState } from "react";
import { MemberRecordsSection } from "../features/records/components/MemberRecordsSection";
import { RecordsDateNav } from "../features/records/components/RecordsDateNav";
import {
  getTokyoToday,
  isTokyoDateAfter,
  shiftTokyoDate,
} from "../utils/date";

export function RecordsPage() {
  const today = getTokyoToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;
  const canGoNext = !isTokyoDateAfter(shiftTokyoDate(selectedDate, 1), today);

  return (
    <div className="mx-auto max-w-2xl">
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

      <div className="mt-6 space-y-6">
        <MemberRecordsSection
          member="child"
          date={selectedDate}
          title="むすめ の きろく"
        />
        <MemberRecordsSection
          member="mother"
          date={selectedDate}
          title="ママ の きろく"
        />
      </div>
    </div>
  );
}
