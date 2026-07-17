import { RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { Member } from "../../../api/schemas/oshigotoSchema";
import { useRecordsTasksQuery } from "../queries/useRecordsTasksQuery";
import { RecordTaskRow } from "./RecordTaskRow";

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
  const query = useRecordsTasksQuery(member, date);

  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-base font-black text-[var(--text)]">{title}</h2>

      <div className="overflow-hidden rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white shadow-sm">
        {query.isPending && (
          <p
            role="status"
            aria-live="polite"
            className="px-4 py-6 text-center text-sm text-[var(--muted-text)]"
          >
            よみこみ中…
          </p>
        )}

        {query.isError && (
          <div
            role="alert"
            className="space-y-3 px-4 py-6 text-center"
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
          <>
            {query.data.tasks.map((task) => (
              <RecordTaskRow key={task.slug} task={task} />
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--card-neutral-border)] bg-[var(--mother-blue-soft)]/35 px-4 py-3">
              <span className="text-sm font-bold text-[var(--text)]">
                この日ぜんぶで
              </span>
              <span
                className="text-sm font-black tabular-nums text-[var(--mother-blue-strong)]"
                aria-label={`合計${query.data.summary.today_done_count}回`}
              >
                ×{query.data.summary.today_done_count}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
