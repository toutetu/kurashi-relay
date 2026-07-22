import { Pencil } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateHomeEvent } from "../../../api/home";
import type { Member, TaskRecord } from "../../../api/schemas/oshigotoSchema";
import { Button } from "../../../components/ui/Button";
import {
  formatTime,
  toTokyoTimeInputValue,
  tokyoDateTimeFromParts,
} from "../../../utils/date";
import { recordsTimelineQueryKey } from "../queries/useRecordsTimelineQuery";

type RecordsTimelineListProps = {
  records: TaskRecord[];
  member: Member;
  date: string;
};

export function RecordsTimelineList({
  records,
  member,
  date,
}: RecordsTimelineListProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [timeValue, setTimeValue] = useState("00:00");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <p className="rounded-[1.25rem] border border-dashed border-[var(--card-neutral-border)] bg-white px-3 py-6 text-center text-xs text-[var(--muted-text)] shadow-sm sm:text-sm">
        この日のきろくはまだありません
      </p>
    );
  }

  const startEdit = (record: TaskRecord) => {
    setEditingId(record.id);
    setTimeValue(toTokyoTimeInputValue(record.completed_at));
    setErrorMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMessage(null);
  };

  const save = async (record: TaskRecord) => {
    if (!/^\d{2}:\d{2}$/.test(timeValue)) {
      setErrorMessage("時刻を入力してください。");
      return;
    }
    if (savingId !== null) return;

    setSavingId(record.id);
    setErrorMessage(null);
    const occurredAt = tokyoDateTimeFromParts(date, timeValue);

    try {
      await updateHomeEvent(record.id, {
        occurred_at: occurredAt,
      });
      await queryClient.invalidateQueries({
        queryKey: recordsTimelineQueryKey(member, date),
      });
      setEditingId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "時刻の保存に失敗しました。もう一度お試しください。",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <ol className="overflow-hidden rounded-[1.25rem] border border-[var(--card-neutral-border)] bg-white shadow-sm">
        {records.map((record) => {
          const editing = editingId === record.id;
          return (
            <li
              key={record.id}
              className="border-b border-[var(--card-neutral-border)] px-2.5 py-2.5 last:border-b-0 sm:px-3 sm:py-3"
            >
              {editing ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold leading-snug text-[var(--text)] sm:text-sm">
                    {record.task_title ?? record.task}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-[11px] font-bold text-[var(--muted-text)]">
                      時刻
                      <input
                        type="time"
                        value={timeValue}
                        onChange={(event) => setTimeValue(event.target.value)}
                        className="mt-0.5 block min-h-9 rounded-lg border border-[var(--line)] px-2 text-[13px] font-bold text-[var(--text)]"
                      />
                    </label>
                    <Button
                      onClick={() => void save(record)}
                      disabled={savingId !== null}
                      loading={savingId === record.id}
                      variant="solid"
                      tone="blue"
                      size="compact"
                      className="!min-h-9 !px-2.5 !text-[11px]"
                    >
                      保存
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      disabled={savingId !== null}
                      variant="outline"
                      tone="neutral"
                      size="compact"
                      className="!min-h-9 !px-2.5 !text-[11px]"
                    >
                      やめる
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 sm:gap-3">
                  <time
                    dateTime={record.completed_at}
                    className="shrink-0 pt-0.5 text-xs font-black tabular-nums text-[var(--mother-blue-strong)] sm:text-sm"
                  >
                    {formatTime(record.completed_at)}
                  </time>
                  <span className="min-w-0 flex-1 text-xs font-bold leading-snug text-[var(--text)] sm:text-sm">
                    {record.task_title ?? record.task}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(record)}
                    aria-label={`${record.task_title ?? record.task}の時刻を修正`}
                    className="pressable inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 text-[10px] font-bold text-[var(--muted-text)] hover:bg-[var(--neutral-soft)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
                  >
                    <Pencil aria-hidden="true" size={12} />
                    時刻
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {errorMessage && (
        <p className="text-xs font-bold text-[var(--coral)]" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
