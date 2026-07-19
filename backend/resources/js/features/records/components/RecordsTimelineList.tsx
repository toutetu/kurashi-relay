import type { TaskRecord } from "../../../api/schemas/oshigotoSchema";
import { formatTime } from "../../../utils/date";

type RecordsTimelineListProps = {
  records: TaskRecord[];
};

export function RecordsTimelineList({ records }: RecordsTimelineListProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-[1.25rem] border border-dashed border-[var(--card-neutral-border)] bg-white px-3 py-6 text-center text-xs text-[var(--muted-text)] shadow-sm sm:text-sm">
        この日のきろくはまだありません
      </p>
    );
  }

  return (
    <ol className="overflow-hidden rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white shadow-sm">
      {records.map((record) => (
        <li
          key={record.id}
          className="flex items-start gap-2 border-b border-[var(--card-neutral-border)] px-2.5 py-2.5 last:border-b-0 sm:gap-3 sm:px-3 sm:py-3"
        >
          <time
            dateTime={record.completed_at}
            className="shrink-0 pt-0.5 text-xs font-black tabular-nums text-[var(--mother-blue-strong)] sm:text-sm"
          >
            {formatTime(record.completed_at)}
          </time>
          <span className="min-w-0 text-xs font-bold leading-snug text-[var(--text)] sm:text-sm">
            {record.task_title ?? record.task}
          </span>
        </li>
      ))}
    </ol>
  );
}
