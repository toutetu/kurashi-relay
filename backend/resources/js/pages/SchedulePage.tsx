import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarPlus,
  Link2,
  RefreshCcw,
  Trash2,
  Unlink,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createCalendarConnection,
  disconnectCalendarConnection,
  getCalendarConnections,
  startGoogleCalendarOAuth,
  syncCalendarConnection,
} from "../api/calendar";
import {
  cancelPlannedActivity,
  createPlannedActivity,
  getPlannedActivities,
  getPlannedActivityOptions,
  type PlannedActivity,
} from "../api/plannedActivities";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { formatTime as formatClock, formatTimeRange } from "../utils/date";

function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatPlanClock(iso: string | null, isAllDay: boolean): string {
  if (isAllDay) return "終日";
  if (!iso) return "--:--";
  return formatClock(iso);
}

function formatPlanRange(item: PlannedActivity): string {
  if (item.is_all_day) return "終日";
  if (!item.planned_start_at) return "時刻なし";
  if (!item.planned_end_at) return formatClock(item.planned_start_at);
  return formatTimeRange(item.planned_start_at, item.planned_end_at);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(todayJst);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<"mother" | "child">("child");
  const [startTime, setStartTime] = useState("09:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [activityDefinitionId, setActivityDefinitionId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [oauthFallbackUrl, setOauthFallbackUrl] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["planned-activities", date],
    queryFn: ({ signal }) => getPlannedActivities(date, undefined, signal),
  });

  const optionsQuery = useQuery({
    queryKey: ["planned-activity-options"],
    queryFn: ({ signal }) => getPlannedActivityOptions(signal),
  });

  const connectionsQuery = useQuery({
    queryKey: ["calendar-connections"],
    queryFn: ({ signal }) => getCalendarConnections(signal),
  });

  useEffect(() => {
    const status = searchParams.get("calendar");
    if (status === "connected") {
      setSyncMessage("Googleカレンダーに接続しました。取り込みを実行できます。");
      void queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      setSearchParams({}, { replace: true });
    } else if (status === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      setSyncMessage(`Google接続に失敗しました（${reason}）。もう一度お試しください。`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

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

  const connectMutation = useMutation({
    mutationFn: async () => {
      const bundle =
        connectionsQuery.data ?? (await getCalendarConnections());
      const existing = bundle.connections[0];
      const connection =
        existing ??
        (await createCalendarConnection({
          display_name: "Googleカレンダー",
        }));
      return startGoogleCalendarOAuth(connection.id);
    },
    onSuccess: (oauthUrl) => {
      setOauthFallbackUrl(oauthUrl);
      setSyncMessage(
        "Googleの認可画面へ移動します。開かない場合は下のリンクを押してください。",
      );
      // 非同期後の外部遷移がブラウザに止められることがあるため、両方用意する。
      window.setTimeout(() => {
        window.location.assign(oauthUrl);
      }, 50);
    },
    onError: (error: unknown) => {
      setOauthFallbackUrl(null);
      setSyncMessage(
        error instanceof ApiError
          ? error.message
          : "Google接続の開始に失敗しました。",
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: number) => disconnectCalendarConnection(id),
    onSuccess: async () => {
      setSyncMessage("Googleカレンダー接続を解除しました。");
      await queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
    },
    onError: (error: unknown) => {
      setSyncMessage(
        error instanceof ApiError
          ? error.message
          : "接続の解除に失敗しました。",
      );
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const bundle =
        connectionsQuery.data ?? (await getCalendarConnections());
      const connection =
        bundle.connections[0] ??
        (await createCalendarConnection({
          display_name: "Googleカレンダー",
        }));
      return syncCalendarConnection(connection.id, date);
    },
    onSuccess: async (result) => {
      setSyncMessage(result.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["planned-activities", date] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-connections"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error: unknown) => {
      setSyncMessage(
        error instanceof ApiError
          ? error.message
          : "カレンダーの取り込みに失敗しました。",
      );
    },
  });

  const items = listQuery.data ?? [];
  const options = optionsQuery.data ?? [];
  const connection = connectionsQuery.data?.connections[0] ?? null;
  const oauthConfigured = connectionsQuery.data?.oauthConfigured ?? false;
  const isConnected = connection?.connected === true || connection?.oauth_ready === true;

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

  function renderTimeline(emptyLabel: string, list: PlannedActivity[]) {
    if (list.length === 0) {
      return (
        <p className="text-sm text-[var(--muted-text)]">
          {emptyLabel}の予定はまだありません。
        </p>
      );
    }

    return (
      <ol className="list-none space-y-0 p-0">
        {list.map((item, index) => {
          const isLast = index === list.length - 1;
          return (
            <li key={item.id} className="flex gap-3 pb-3 last:pb-1">
              <time className="w-11 shrink-0 pt-0.5 text-right text-[13.5px] font-extrabold tabular-nums text-[var(--primary-deep)]">
                {formatPlanClock(item.planned_start_at, item.is_all_day)}
              </time>
              <span className="flex w-3.5 shrink-0 flex-col items-center">
                <span className="mt-1 size-2.5 rounded-full border-[2.5px] border-[var(--primary)] bg-white" />
                {!isLast && (
                  <span className="mt-0.5 w-0.5 flex-1 rounded-sm bg-[var(--line)]" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="block text-[13.5px] font-bold text-[var(--ink)]">
                    {item.title}
                  </span>
                  {item.editable ? (
                    <Button
                      variant="ghost"
                      tone="neutral"
                      size="compact"
                      icon={Trash2}
                      aria-label={`${item.title}を取り消す`}
                      loading={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(item.id)}
                    >
                      取消
                    </Button>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-[var(--muted)] tabular-nums">
                  {formatPlanRange(item)}
                  {" ・ "}
                  {sourceLabel(item.source_type)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
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

      {listQuery.isLoading ? (
        <p className="text-sm text-[var(--muted-text)]">読み込み中…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-[var(--coral-deep)]" role="alert">
          予定を読み込めませんでした。
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard
            title="むすめの予定"
            icon={UserRound}
            tone="daughter"
            density="compact"
          >
            {renderTimeline("むすめ", grouped.child)}
          </DashboardCard>
          <DashboardCard
            title="私の予定"
            icon={CalendarDays}
            tone="blue"
            density="compact"
          >
            {renderTimeline("私", grouped.mother)}
          </DashboardCard>
        </div>
      )}

      {grouped.other.length > 0 ? (
        <DashboardCard title="その他" icon={CalendarDays} tone="neutral" density="compact">
          {renderTimeline("その他", grouped.other)}
        </DashboardCard>
      ) : null}

      <DashboardCard title="Googleカレンダー" icon={CalendarDays} tone="yellow">
        <p className="text-sm text-[var(--muted-text)]">
          {isConnected
            ? `接続中${connection?.provider_account_id ? `（${connection.provider_account_id}）` : ""}。取り込んだ予定は右の「私の予定」に表示されます。`
            : oauthConfigured
              ? "まだGoogleに接続していません。「Googleに接続」から連携すると、実カレンダーの予定を取り込めます。"
              : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を .env に設定すると、Googleへ接続できます。未設定時の取り込みは確認用サンプルです。"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <Button
              icon={Link2}
              loading={connectMutation.isPending}
              disabled={!oauthConfigured}
              onClick={() => {
                setSyncMessage(null);
                setOauthFallbackUrl(null);
                connectMutation.mutate();
              }}
            >
              {connectMutation.isPending ? "接続準備中…" : "Googleに接続"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              tone="neutral"
              icon={Unlink}
              loading={disconnectMutation.isPending}
              onClick={() => {
                if (connection) disconnectMutation.mutate(connection.id);
              }}
            >
              接続を解除
            </Button>
          )}
          <Button
            icon={RefreshCcw}
            loading={syncMutation.isPending}
            onClick={() => {
              setSyncMessage(null);
              syncMutation.mutate();
            }}
          >
            {syncMutation.isPending ? "取り込み中…" : "カレンダーから取り込む"}
          </Button>
          {connection?.last_synced_at ? (
            <span className="text-xs text-[var(--muted-text)]">
              前回:{" "}
              {new Intl.DateTimeFormat("ja-JP", {
                timeZone: "Asia/Tokyo",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(connection.last_synced_at))}
            </span>
          ) : null}
        </div>
        {syncMessage ? (
          <p
            className={`mt-3 text-sm font-bold ${
              syncMessage.includes("失敗") || syncMessage.includes("エラー")
                ? "text-[var(--coral-deep)]"
                : "text-[var(--green)]"
            }`}
            role="status"
          >
            {syncMessage}
          </p>
        ) : null}
        {oauthFallbackUrl ? (
          <p className="mt-2 text-sm">
            <a
              href={oauthFallbackUrl}
              className="font-bold text-[var(--primary-deep)] underline"
            >
              Googleの認可画面を開く
            </a>
          </p>
        ) : null}
      </DashboardCard>

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
    </div>
  );
}
