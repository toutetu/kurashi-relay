import { RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { Member } from "../../../api/schemas/oshigotoSchema";
import { aggregateRecordsToCountedTasks } from "../aggregateRecordsToCountedTasks";
import { useRecordsTimelineQuery } from "../queries/useRecordsTimelineQuery";
import { RecordsMemberList } from "./RecordsMemberList";

type MemberRecordsSectionProps = {
  member: Member;
  date: string;
  title: string;
};

export function MemberRecordsSection({
  member,
  date,
  title,
}: MemberRecordsSectionProps) {
  // 回数ビューも時系列 API と同じ正本から集計し、合計と行のずれを防ぐ
  const query = useRecordsTimelineQuery(member, date);
  const countedTasks = aggregateRecordsToCountedTasks(query.data?.records ?? []);
  const todayDoneCount = countedTasks.reduce((sum, task) => sum + task.count, 0);

  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-base font-black text-[var(--text)]">{title}</h2>

      {query.isPending && (
        <div className="overflow-hidden rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white shadow-sm">
          <p
            role="status"
            aria-live="polite"
            className="px-4 py-6 text-center text-sm text-[var(--muted-text)]"
          >
            よみこみ中…
          </p>
        </div>
      )}

      {query.isError && (
        <div
          role="alert"
          className="space-y-3 rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white px-4 py-6 text-center shadow-sm"
        >
          <p className="text-sm text-[var(--muted-text)]">
            きろくをよみこめませんでした。もういちどためしてね
          </p>
          <Button
            onClick={() => void query.refetch()}
            loading={query.isFetching}
            variant="outline"
            tone="blue"
            icon={RefreshCcw}
            className="mx-auto"
          >
            {query.isFetching ? "再取得中…" : "もう一度試す"}
          </Button>
        </div>
      )}

      {query.isSuccess && (
        <RecordsMemberList
          tasks={countedTasks}
          todayDoneCount={todayDoneCount}
        />
      )}
    </section>
  );
}
