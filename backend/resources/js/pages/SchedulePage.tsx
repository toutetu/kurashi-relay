import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  cancelPlannedActivity,
  createPlannedActivity,
  getPlannedActivities,
  getPlannedActivityOptions,
  type PlannedActivity,
} from "../api/plannedActivities";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { DashboardCard } from "../components/ui/DashboardCard";

function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTime(iso: string | null, isAllDay: boolean): string {
  if (isAllDay) return "終日";
  if (!iso) return "時刻なし";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function sourceLabel(source: string): string {
  switch (source) {
    case "manual":
      return "手入力";
    case "child_plan":
      return "むすめの見通し";
    case "routine":
      return "ルーチン";
    case "google_calendar":
      return "カレンダー";
    default:
      return source;
  }
}

export function SchedulePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayJst);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<"mother" | "child">("child");
  const [startTime, setStartTime] = useState("09:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [activityDefinitionId, setActivityDefinitionId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["planned-activities", date],
    queryFn: ({ signal }) => getPlannedActivities(date, undefined, signal),
  });

  const optionsQuery = useQuery({
    queryKey: ["planned-activity-options"],
    queryFn: ({ signal }) => getPlannedActivityOptions(signal),
  });

  const createMutation = useMutation({
    mutationFn: createPlannedActivity,
    onSuccess: async () => {
      setTitle("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["planned-activities", date] });
    },
    onError: (error: unknown) => {
      setFormError(
        error instanceof ApiError ? error.message : "予定を保存できませんでした。",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPlannedActivity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["planned-activities", date] });
    },
  });

  const items = listQuery.data ?? [];
  const options = optionsQuery.data ?? [];

  const grouped = useMemo(() => {
    const mother = items.filter((item) => item.subject === "mother");
    const child = items.filter((item) => item.subject === "child");
    const other = items.filter(
      (item) => item.subject !== "mother" && item.subject !== "child",
    );
    return { mother, child, other };
  }, [items]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setFormError("予定の名前を入力してください。");
      return;
    }

    let plannedStartAt: string | null = null;
    if (!isAllDay) {
      plannedStartAt = `${date}T${startTime}:00+09:00`;
    }

    createMutation.mutate({
      subject,
      title: trimmed,
      local_date: date,
      activity_definition_id: activityDefinitionId
        ? Number(activityDefinitionId)
        : null,
      planned_start_at: plannedStartAt,
      planned_end_at: null,
      is_all_day: isAllDay,
    });
  }

  function renderList(label: string, list: PlannedActivity[]) {
    if (list.length === 0) {
      return (
        <p className="text-sm text-[var(--muted-text)]">{label}の予定はまだありません。</p>
      );
    }

    return (
      <ul className="space-y-2">
        {list.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <p className="font-bold text-[var(--ink)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--muted-text)]">
                {formatTime(item.planned_start_at, item.is_all_day)}
                {" ・ "}
                {sourceLabel(item.source_type)}
              </p>
            </div>
            {item.editable ? (
              <Button
                variant="ghost"
                tone="neutral"
                icon={Trash2}
                aria-label={`${item.title}を取り消す`}
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(item.id)}
              >
                取消
              </Button>
            ) : (
              <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs text-[var(--primary-deep)]">
                参照のみ
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm font-bold text-[var(--muted-text)]">予定</p>
        <h1 className="mt-1 text-2xl font-black">今日の予定</h1>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-[var(--muted-text)]">日付</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
      </header>

      <DashboardCard title="予定を追加" icon={CalendarPlus} tone="blue">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="font-bold">名前</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
              placeholder="例: 学校の送迎"
              maxLength={100}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-bold">対象</span>
              <select
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value as "mother" | "child")
                }
                className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
              >
                <option value="child">むすめ</option>
                <option value="mother">ママ</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-bold">活動マスタ（任意）</span>
              <select
                value={activityDefinitionId}
                onChange={(event) => setActivityDefinitionId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
              >
                <option value="">指定なし</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.quick_label || option.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(event) => setIsAllDay(event.target.checked)}
              />
              終日
            </label>
            {!isAllDay ? (
              <label className="inline-flex items-center gap-2 text-sm">
                <span className="font-bold">開始</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="rounded-xl border border-[var(--line)] px-3 py-2"
                />
              </label>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm text-[var(--coral-deep)]" role="alert">
              {formError}
            </p>
          ) : null}

          <Button type="submit" loading={createMutation.isPending}>
            予定を追加
          </Button>
        </form>
      </DashboardCard>

      <DashboardCard title="むすめの予定" tone="daughter">
        {listQuery.isLoading ? (
          <p className="text-sm text-[var(--muted-text)]">読み込み中…</p>
        ) : listQuery.isError ? (
          <p className="text-sm text-[var(--coral-deep)]" role="alert">
            予定を読み込めませんでした。
          </p>
        ) : (
          renderList("むすめ", grouped.child)
        )}
      </DashboardCard>

      <DashboardCard title="ママの予定" tone="blue">
        {renderList("ママ", grouped.mother)}
      </DashboardCard>

      {grouped.other.length > 0 ? (
        <DashboardCard title="その他" tone="neutral">
          {renderList("その他", grouped.other)}
        </DashboardCard>
      ) : null}
    </div>
  );
}
