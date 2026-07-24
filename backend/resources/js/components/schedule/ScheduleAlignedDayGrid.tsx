import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { PlannedActivity } from "../../api/plannedActivities";
import { formatTime as formatClock, formatTimeRange } from "../../utils/date";
import { Button } from "../ui/Button";

const TOKYO = "Asia/Tokyo";
const PX_PER_HOUR = 56;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
const DEFAULT_START_MINUTE = 6 * 60;
const DEFAULT_END_MINUTE = 22 * 60;
const MIN_EVENT_MINUTES = 30;
const DAY_MINUTES = 24 * 60;

type Props = {
  childItems: PlannedActivity[];
  motherItems: PlannedActivity[];
  onCancel?: (id: number) => void;
  cancelPending?: boolean;
};

function tokyoMinuteOfDay(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TOKYO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour ?? "0");
  const minute = Number(values.minute ?? "0");
  return hour * 60 + minute;
}

function formatHourLabel(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function splitItems(items: PlannedActivity[]) {
  const allDay: PlannedActivity[] = [];
  const timed: PlannedActivity[] = [];
  for (const item of items) {
    if (item.is_all_day || !item.planned_start_at) {
      allDay.push(item);
    } else {
      timed.push(item);
    }
  }
  return { allDay, timed };
}

function resolveWindow(timedItems: PlannedActivity[]): {
  startMinute: number;
  endMinute: number;
} {
  if (timedItems.length === 0) {
    return {
      startMinute: DEFAULT_START_MINUTE,
      endMinute: DEFAULT_END_MINUTE,
    };
  }

  let minStart = DAY_MINUTES;
  let maxEnd = 0;
  for (const item of timedItems) {
    if (!item.planned_start_at) continue;
    const start = tokyoMinuteOfDay(item.planned_start_at);
    const end = item.planned_end_at
      ? Math.max(tokyoMinuteOfDay(item.planned_end_at), start + MIN_EVENT_MINUTES)
      : start + MIN_EVENT_MINUTES;
    minStart = Math.min(minStart, start);
    maxEnd = Math.max(maxEnd, end);
  }

  const startMinute = Math.min(
    DEFAULT_START_MINUTE,
    Math.max(0, Math.floor(minStart / 60) * 60),
  );
  const endMinute = Math.max(
    DEFAULT_END_MINUTE,
    Math.min(DAY_MINUTES, Math.ceil(maxEnd / 60) * 60),
  );

  return {
    startMinute,
    endMinute: Math.max(endMinute, startMinute + 60),
  };
}

function eventStyle(
  item: PlannedActivity,
  startMinute: number,
): { top: number; height: number } | null {
  if (!item.planned_start_at) return null;
  const start = tokyoMinuteOfDay(item.planned_start_at);
  const rawEnd = item.planned_end_at
    ? tokyoMinuteOfDay(item.planned_end_at)
    : start + MIN_EVENT_MINUTES;
  const end = Math.max(rawEnd, start + MIN_EVENT_MINUTES);
  return {
    top: (start - startMinute) * PX_PER_MINUTE,
    height: Math.max((end - start) * PX_PER_MINUTE, 28),
  };
}

function sourceLabel(source: string): string {
  switch (source) {
    case "google_calendar":
      return "カレンダー";
    case "child_plan":
      return "むすめの見通し";
    case "manual":
      return "手入力";
    case "routine":
      return "ルーチン";
    default:
      return "アプリ";
  }
}

/** Google取込は左右で色分け。アプリ由来は藤色。枠線はヘアライン。文言でも区別する。 */
function sourceToneClass(
  source: string,
  column: "child" | "mother",
): string {
  if (source === "google_calendar") {
    if (column === "child") {
      return "border-[var(--cat-blue)] bg-[var(--cat-blue-soft)]";
    }
    return "border-[var(--amber)] bg-[var(--amber-soft)]";
  }
  return "border-[var(--fuji)] bg-[var(--fuji-soft)]";
}

function EventBlock({
  item,
  startMinute,
  column,
  onCancel,
  cancelPending,
}: {
  item: PlannedActivity;
  startMinute: number;
  column: "child" | "mother";
  onCancel?: (id: number) => void;
  cancelPending?: boolean;
}) {
  const style = eventStyle(item, startMinute);
  if (!style) return null;

  return (
    <article
      className={`absolute inset-x-1 overflow-hidden rounded-xl border px-2 py-1 ${sourceToneClass(item.source_type, column)}`}
      style={{ top: style.top, height: style.height }}
      title={`${item.title}（${sourceLabel(item.source_type)}）`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[var(--ink)]">
          {item.title}
        </p>
        {item.editable && onCancel ? (
          <Button
            purpose="low"
            tone="default"
            size="compact"
            icon={Trash2}
            aria-label={`${item.title}を取り消す`}
            loading={cancelPending}
            onClick={() => onCancel(item.id)}
          >
            取消
          </Button>
        ) : null}
      </div>
      <p className="mt-0.5 text-[10.5px] tabular-nums text-[var(--muted-text)]">
        {item.planned_end_at
          ? formatTimeRange(item.planned_start_at!, item.planned_end_at)
          : formatClock(item.planned_start_at!)}
        {" ・ "}
        {sourceLabel(item.source_type)}
      </p>
    </article>
  );
}

function AllDayList({
  items,
  emptyLabel,
  column,
  onCancel,
  cancelPending,
}: {
  items: PlannedActivity[];
  emptyLabel: string;
  column: "child" | "mother";
  onCancel?: (id: number) => void;
  cancelPending?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-[11.5px] text-[var(--muted-text)]">{emptyLabel}</p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-start justify-between gap-2 rounded-xl border px-2 py-1 ${sourceToneClass(item.source_type, column)}`}
        >
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-bold text-[var(--ink)]">
              {item.title}
            </span>
            <span className="text-[10.5px] text-[var(--muted-text)]">
              終日 ・ {sourceLabel(item.source_type)}
            </span>
          </span>
          {item.editable && onCancel ? (
            <Button
              purpose="low"
              tone="default"
              size="compact"
              icon={Trash2}
              aria-label={`${item.title}を取り消す`}
              loading={cancelPending}
              onClick={() => onCancel(item.id)}
            >
              取消
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ColumnLane({
  items,
  startMinute,
  hours,
  height,
  column,
  onCancel,
  cancelPending,
}: {
  items: PlannedActivity[];
  startMinute: number;
  hours: number[];
  height: number;
  column: "child" | "mother";
  onCancel?: (id: number) => void;
  cancelPending?: boolean;
}) {
  return (
    <div className="relative min-w-0 border-l border-[var(--line)] bg-[var(--surface)]" style={{ height }}>
      {hours.map((minute) => (
        <div
          key={minute}
          className="pointer-events-none absolute inset-x-0 border-t border-[var(--line-soft)]"
          style={{ top: (minute - startMinute) * PX_PER_MINUTE }}
          aria-hidden="true"
        />
      ))}
      {items.map((item) => (
        <EventBlock
          key={item.id}
          item={item}
          startMinute={startMinute}
          column={column}
          onCancel={onCancel}
          cancelPending={cancelPending}
        />
      ))}
    </div>
  );
}

export function ScheduleAlignedDayGrid({
  childItems,
  motherItems,
  onCancel,
  cancelPending,
}: Props) {
  const childSplit = useMemo(() => splitItems(childItems), [childItems]);
  const motherSplit = useMemo(() => splitItems(motherItems), [motherItems]);

  const { startMinute, endMinute } = useMemo(
    () => resolveWindow([...childSplit.timed, ...motherSplit.timed]),
    [childSplit.timed, motherSplit.timed],
  );

  const hours = useMemo(() => {
    const labels: number[] = [];
    for (let minute = startMinute; minute < endMinute; minute += 60) {
      labels.push(minute);
    }
    return labels;
  }, [startMinute, endMinute]);

  const height = (endMinute - startMinute) * PX_PER_MINUTE;
  const hasAny =
    childItems.length > 0 ||
    motherItems.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-[var(--muted-text)]">
        むすめ・私の予定はまだありません。下の Googleカレンダーから取り込めます。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <div aria-hidden="true" />
        <p className="text-sm font-black text-[var(--ink)]">むすめ</p>
        <p className="text-sm font-black text-[var(--ink)]">私</p>
      </div>

      {(childSplit.allDay.length > 0 || motherSplit.allDay.length > 0) && (
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <p className="pt-1 text-[11px] font-bold text-[var(--muted-text)]">終日</p>
          <AllDayList
            items={childSplit.allDay}
            emptyLabel="なし"
            column="child"
            onCancel={onCancel}
            cancelPending={cancelPending}
          />
          <AllDayList
            items={motherSplit.allDay}
            emptyLabel="なし"
            column="mother"
            onCancel={onCancel}
            cancelPending={cancelPending}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid min-w-[20rem] grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <div className="relative" style={{ height }} aria-hidden="true">
            {hours.map((minute) => (
              <div
                key={minute}
                className="absolute right-0 w-full border-t border-[var(--line-soft)] pr-1 text-right text-[10.5px] font-bold tabular-nums text-[var(--muted-text)]"
                style={{ top: (minute - startMinute) * PX_PER_MINUTE }}
              >
                {formatHourLabel(minute)}
              </div>
            ))}
          </div>

          <ColumnLane
            items={childSplit.timed}
            startMinute={startMinute}
            hours={hours}
            height={height}
            column="child"
            onCancel={onCancel}
            cancelPending={cancelPending}
          />
          <ColumnLane
            items={motherSplit.timed}
            startMinute={startMinute}
            hours={hours}
            height={height}
            column="mother"
            onCancel={onCancel}
            cancelPending={cancelPending}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11.5px] text-[var(--muted-text)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-[var(--cat-blue)] bg-[var(--cat-blue-soft)]" aria-hidden="true" />
          むすめ・Googleカレンダー
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-[var(--amber)] bg-[var(--amber-soft)]" aria-hidden="true" />
          私・Googleカレンダー
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-[var(--fuji)] bg-[var(--fuji-soft)]" aria-hidden="true" />
          アプリ（むすめの見通し・手入力）
        </span>
      </div>
      <p className="text-[11.5px] text-[var(--muted-text)]">
        左右は同じ時間軸です。同じ高さの予定は同じ時刻帯の重なりです。
      </p>
    </div>
  );
}
