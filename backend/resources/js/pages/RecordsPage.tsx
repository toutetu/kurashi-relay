import { ClipboardPenLine, Hash, LayoutList, ListOrdered } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { MemberRecordsSection } from "../features/records/components/MemberRecordsSection";
import { MemberTimelineSection } from "../features/records/components/MemberTimelineSection";
import { RecordsDateNav } from "../features/records/components/RecordsDateNav";
import { RecordsDetailSheet } from "../features/records/components/RecordsDetailSheet";
import {
  getTokyoToday,
  isTokyoDateAfter,
  shiftTokyoDate,
} from "../utils/date";

type RecordsPageProps = {
  scope?: "child" | "all";
};

type MamaRecordsView = "timeline" | "counts";

export function RecordsPage({ scope = "all" }: RecordsPageProps) {
  const today = getTokyoToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mamaView, setMamaView] = useState<MamaRecordsView>("timeline");
  const isToday = selectedDate === today;
  const canGoNext = !isTokyoDateAfter(shiftTokyoDate(selectedDate, 1), today);
  const isChildOnly = scope === "child";

  return (
    <div
      className={`mx-auto max-w-2xl ${isChildOnly ? "" : "md:max-w-4xl"}`}
    >
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
          <ClipboardPenLine aria-hidden="true" size={17} />
          {isChildOnly ? "きろくを見る" : "記録を見る"}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          {isChildOnly ? "この日のきろく" : "この日の記録"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
          {isChildOnly
            ? "むすめが、その日に何を何回やったかを見られます。"
            : mamaView === "timeline"
              ? "むすめとママが、その日にやったことを時刻順に見られます。"
              : "むすめとママが、その日に何を何回やったかを見られます。"}
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

      {isChildOnly ? (
        <>
          <div className="mt-4 flex justify-center">
            <Button
              purpose="secondary"
              tone="default"
              icon={LayoutList}
              onClick={() => setDetailOpen(true)}
            >
              詳しく
            </Button>
          </div>

          <div className="mt-6">
            <MemberRecordsSection
              member="child"
              date={selectedDate}
              title="むすめ の きろく"
            />
          </div>

          {detailOpen && (
            <RecordsDetailSheet
              date={selectedDate}
              scope="child"
              onClose={() => setDetailOpen(false)}
            />
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex justify-center">
            {mamaView === "timeline" ? (
              <Button
                purpose="secondary"
                tone="default"
                icon={Hash}
                onClick={() => setMamaView("counts")}
              >
                回数
              </Button>
            ) : (
              <Button
                purpose="secondary"
                tone="default"
                icon={ListOrdered}
                onClick={() => setMamaView("timeline")}
              >
                時系列
              </Button>
            )}
          </div>

          {mamaView === "timeline" ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="min-w-0 order-2 md:order-1">
                <MemberTimelineSection
                  member="mother"
                  date={selectedDate}
                  title="ママ の きろく"
                />
              </div>
              <div className="min-w-0 order-1 md:order-2">
                <MemberTimelineSection
                  member="child"
                  date={selectedDate}
                  title="むすめ の きろく"
                />
              </div>
            </div>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}
