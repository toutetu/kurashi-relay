import { RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { Member } from "../../../api/schemas/oshigotoSchema";
import { useRecordsTimelineQuery } from "../queries/useRecordsTimelineQuery";
import { RecordsTimelineList } from "./RecordsTimelineList";

type MemberTimelineSectionProps = {
  member: Member;
  date: string;
  title: string;
};

export function MemberTimelineSection({
  member,
  date,
  title,
}: MemberTimelineSectionProps) {
  const query = useRecordsTimelineQuery(member, date);

  return (
    <section aria-label={title} className="min-w-0 space-y-2">
      <h2 className="text-base font-black text-[var(--text)]">{title}</h2>

      {query.isPending && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white px-4 py-6 text-center text-sm text-[var(--muted-text)] shadow-sm"
        >
          よみこみ中…
        </p>
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
            purpose="secondary"
            tone="default"
            icon={RefreshCcw}
            className="mx-auto"
          >
            {query.isFetching ? "再取得中…" : "もう一度試す"}
          </Button>
        </div>
      )}

      {query.isSuccess && (
        <RecordsTimelineList
          records={query.data.records}
          member={member}
          date={date}
        />
      )}
    </section>
  );
}
