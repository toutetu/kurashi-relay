import { RecordTaskRow } from "@/features/records/components/RecordTaskRow";
import type { MemberRecordsPayload } from "@/inertia/types";

type InertiaMemberRecordsSectionProps = {
  title: string;
  payload: MemberRecordsPayload;
};

export function InertiaMemberRecordsSection({
  title,
  payload,
}: InertiaMemberRecordsSectionProps) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-base font-black text-[var(--text)]">{title}</h2>

      <div className="overflow-hidden rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white shadow-sm">
        {payload.tasks.map((task) => (
          <RecordTaskRow key={task.slug} task={task} />
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--card-neutral-border)] bg-[var(--mother-blue-soft)]/35 px-4 py-3">
          <span className="text-sm font-bold text-[var(--text)]">この日ぜんぶで</span>
          <span
            className="text-sm font-black tabular-nums text-[var(--mother-blue-strong)]"
            aria-label={`合計${payload.summary.today_done_count}回`}
          >
            ×{payload.summary.today_done_count}
          </span>
        </div>
      </div>
    </section>
  );
}
