import {
  Activity,
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
  Heart,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  ActualEntry,
  ActualKind,
  DifferenceStatus,
  ScheduleComparisonItem,
} from "../../../types/dashboard";
import { formatMinutes, formatTimeRange } from "../../../utils/date";

const differenceLabels: Record<DifferenceStatus, string> = {
  on_schedule: "予定どおり",
  delayed: "開始遅れ",
  interrupted: "中断",
  cancelled: "中止",
  moved_to_night: "夜へ振り替え",
  unplanned_activity: "予定外の活動",
  no_plan_no_record: "記録なし",
};

const differenceStyles: Record<DifferenceStatus, string> = {
  on_schedule: "bg-[#e7f7ed] text-[#287a49]",
  delayed: "bg-[#fff0b8] text-[#77550b]",
  interrupted: "bg-[#ffe0e1] text-[#a4373d]",
  cancelled: "bg-[#ffe0e1] text-[#a4373d]",
  moved_to_night: "bg-[#eee8ff] text-[#684baa]",
  unplanned_activity: "bg-[#eee8ff] text-[#684baa]",
  no_plan_no_record: "bg-slate-100 text-[#526078]",
};

const kindMetadata: Record<
  ActualKind,
  { label: string; icon: LucideIcon; style: string }
> = {
  sleep: { label: "睡眠", icon: Moon, style: "bg-[#edf6ff] text-[#236da8]" },
  activity: {
    label: "活動",
    icon: Activity,
    style: "bg-[#e7f7ed] text-[#287a49]",
  },
  waiting: {
    label: "待機・拘束",
    icon: Clock3,
    style: "bg-[#fff8db] text-[#77550b]",
  },
  recovery: {
    label: "回復",
    icon: Heart,
    style: "bg-[#fff0f1] text-[#a4373d]",
  },
};

function ActualBlock({ actual }: { actual: ActualEntry }) {
  const metadata = kindMetadata[actual.kind];
  const Icon = metadata.icon;
  return (
    <article className="rounded-xl border border-[#cbe7d5] bg-white/85 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time className="text-sm font-black text-[#287a49]">
          {formatTimeRange(actual.startAt, actual.endAt)}
        </time>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-black ${metadata.style}`}
        >
          <Icon aria-hidden="true" size={13} />
          {metadata.label}
        </span>
      </div>
      <p className="mt-2 font-black text-[#28334a]">{actual.title}</p>
      {actual.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[#526078]">
          {actual.details.map((detail) => (
            <li key={detail} className="flex gap-2">
              <span aria-hidden="true">・</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ComparisonRow({ item }: { item: ScheduleComparisonItem }) {
  const noPlan = item.plan === null;
  const noActuals = item.actuals.length === 0;
  const isUnplanned = noPlan && !noActuals;

  return (
    <article className="comparison-grid grid min-w-0 grid-cols-1 gap-2 rounded-[1.4rem] border border-[#dce5ef] bg-white p-3 shadow-[0_8px_24px_rgba(40,51,74,0.06)] md:grid-cols-[5.25rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-0 md:overflow-hidden md:p-0 xl:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
      <header className="rounded-xl bg-[#28334a] px-3 py-2 text-white md:col-start-1 md:row-span-2 md:row-start-1 md:flex md:flex-col md:items-center md:justify-start md:rounded-none md:bg-[#f4f7fa] md:px-2 md:py-5 md:text-[#28334a] xl:row-span-1">
        <span className="text-xs font-bold opacity-80 md:mb-2">時刻</span>
        <time className="font-black md:text-center md:text-sm">
          {formatTimeRange(item.timeRange.start, item.timeRange.end)}
        </time>
      </header>

      <section
        className={`min-w-0 rounded-xl border p-3.5 md:col-start-2 md:row-start-1 md:rounded-none md:border-y-0 md:border-l md:border-r-0 md:p-4 ${noPlan ? "border-dashed border-[#9ac8ee] bg-[#f7fbff]" : "border-[#bcdcf7] bg-[#edf6ff]/65"}`}
      >
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#236da8]">
          <CalendarDays aria-hidden="true" size={17} />
          予定
        </h3>
        {item.plan ? (
          <div>
            <time className="text-sm font-black text-[#236da8]">
              {formatTimeRange(item.plan.startAt, item.plan.endAt)}
            </time>
            <p className="mt-2 font-black text-[#28334a]">{item.plan.title}</p>
            {item.plan.details && item.plan.details.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[#526078]">
                {item.plan.details.map((detail) => (
                  <li key={detail} className="flex gap-2">
                    <span aria-hidden="true">・</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#9ac8ee] bg-white/75 p-3">
            <p className="font-black text-[#236da8]">予定なし</p>
            <p className="mt-1 text-sm leading-relaxed text-[#667085]">
              この時間には予定が登録されていません。
            </p>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-xl border border-[#cbe7d5] bg-[#eff9f2] p-3.5 md:col-start-3 md:row-start-1 md:rounded-none md:border-y-0 md:border-l md:border-r-0 md:p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#287a49]">
          <CheckCircle2 aria-hidden="true" size={17} />
          実績
        </h3>
        {isUnplanned && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eee8ff] px-3 py-1.5 text-xs font-black text-[#684baa]">
            <GitCompareArrows aria-hidden="true" size={14} />
            予定外の活動
          </p>
        )}
        {noActuals ? (
          <div className="rounded-xl border border-dashed border-[#9bc9aa] bg-white/75 p-3">
            <p className="font-black text-[#526078]">実績記録なし</p>
            <p className="mt-1 text-sm leading-relaxed text-[#667085]">
              この時間の実績はまだ入力されていません。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {item.actuals.map((actual) => (
              <ActualBlock key={actual.id} actual={actual} />
            ))}
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-xl border border-[#cfc1f5] bg-[#f8f5ff] p-3.5 md:col-span-2 md:col-start-2 md:row-start-2 md:rounded-none md:border-x md:border-b-0 md:p-4 xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:border-y-0 xl:border-r-0">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#684baa]">
          <GitCompareArrows aria-hidden="true" size={17} />
          差分・原因
        </h3>
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black ${differenceStyles[item.difference.status]}`}
        >
          {differenceLabels[item.difference.status]}
        </span>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4 xl:grid-cols-2">
          {item.difference.startDelayMinutes > 0 && (
            <div className="rounded-xl bg-white/80 p-2.5">
              <dt className="text-xs font-bold text-[#667085]">開始の遅れ</dt>
              <dd className="mt-1 font-black text-[#684baa]">
                {formatMinutes(item.difference.startDelayMinutes)}
              </dd>
            </div>
          )}
          <div className="rounded-xl bg-white/80 p-2.5">
            <dt className="text-xs font-bold text-[#667085]">実績 / 予定</dt>
            <dd className="mt-1 font-black text-[#684baa]">
              {item.difference.actualMinutes}分 /{" "}
              {item.difference.plannedMinutes}分
            </dd>
          </div>
          {item.difference.interruptionCount > 0 && (
            <div className="rounded-xl bg-white/80 p-2.5">
              <dt className="text-xs font-bold text-[#667085]">中断</dt>
              <dd className="mt-1 font-black text-[#684baa]">
                {item.difference.interruptionCount}回
              </dd>
            </div>
          )}
          {item.difference.lostMinutes > 0 && (
            <div className="rounded-xl bg-white/80 p-2.5">
              <dt className="text-xs font-bold text-[#667085]">失われた時間</dt>
              <dd className="mt-1 font-black text-[#684baa]">
                {formatMinutes(item.difference.lostMinutes)}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-3 text-sm leading-relaxed text-[#526078]">
          <span className="font-black">原因：</span>
          {item.difference.causes.length > 0
            ? item.difference.causes.join("・")
            : "特になし"}
        </div>
      </section>
    </article>
  );
}

export function ScheduleComparisonList({
  items,
}: {
  items: ScheduleComparisonItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-[#bcdcf7] bg-white p-8 text-center">
        <CalendarDays
          className="mx-auto text-[#68a7e3]"
          aria-hidden="true"
          size={32}
        />
        <h2 className="mt-3 text-lg font-black text-[#28334a]">
          比較するデータはありません
        </h2>
        <p className="mt-2 text-[#667085]">
          この日の予定と実績はまだ登録されていません。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 hidden rounded-xl border border-[#dce5ef] bg-white px-0 font-black md:grid md:grid-cols-[5.25rem_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
        <span className="p-3 text-center text-sm text-[#526078]">時刻</span>
        <span className="border-l border-[#dce5ef] bg-[#edf6ff] p-3 text-[#236da8]">
          予定
        </span>
        <span className="border-l border-[#dce5ef] bg-[#eff9f2] p-3 text-[#287a49]">
          実績
        </span>
        <span className="hidden border-l border-[#dce5ef] bg-[#f8f5ff] p-3 text-[#684baa] xl:block">
          差分・原因
        </span>
      </div>
      <div className="relative space-y-4 before:absolute before:bottom-4 before:left-5 before:top-4 before:-z-0 before:w-0.5 before:bg-[#d8ecff] md:before:hidden">
        {items.map((item) => (
          <ComparisonRow
            key={`${item.timeRange.start}-${item.timeRange.end}`}
            item={item}
          />
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#bcdcf7] bg-[#edf6ff] p-4 text-sm leading-relaxed text-[#285d8d]">
        <AlarmClock className="mt-0.5 shrink-0" aria-hidden="true" size={19} />
        <p>
          「予定なし」の時間も、実績があれば予定外の活動として表示します。予定も実績もない時間は「実績記録なし」と表示します。
        </p>
      </div>
    </div>
  );
}
