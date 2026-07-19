import type {
  MusumeMode,
  MusumePlan,
  SchoolStartPeriod,
} from "./api/schemas/musumeSchema";

const TOKYO_TIME_ZONE = "Asia/Tokyo";
const SUMMER_VACATION_START_MONTH = 7;
const SUMMER_VACATION_START_DAY = 18;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const UNDECIDED_LABEL = "タップして決めよう";
export const MAMA_DECIDED_RIBBON = "🎀";

export const SUMMER_TODAY_CHIPS = [
  "夏休みの宿題",
  "自由研究",
  "遊ぶ",
  "休む",
  "入浴",
  "その他",
] as const;

export const SCHOOL_TODAY_CHIPS = [
  "宿題",
  "テスト勉強",
  "学校の課題",
  "遊ぶ",
  "休む",
  "入浴",
  "その他",
] as const;

export const SUMMER_TOMORROW_PLAN_CHIPS = [
  "友達と遊ぶ",
  "ゆっくりする",
  "ママとお出かけ",
  "塾に行く",
  "宿題・勉強をする",
  "その他",
] as const;

export const SUMMER_TOMORROW_CHIPS = [
  "水筒",
  "ぼうし",
  "宿題",
  "財布",
  "ハンカチ",
  "その他",
] as const;

export const SUMMER_TODAY_ITEM_CHIPS = [
  "水筒",
  "ぼうし",
  "宿題",
  "財布",
  "ハンカチ",
  "その他",
] as const;

export const SUMMER_BEDTIME_OPTIONS = [
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:00より あと",
] as const;

export const SCHOOL_TOMORROW_CHIPS = [
  "宿題",
  "水筒",
  "体操服",
  "エプロン",
  "提出プリント",
  "財布",
  "定期入れ",
  "ハンカチ",
] as const;

export const WAKE_UP_OPTIONS = [
  { label: "7:00", value: "07:00" },
  { label: "7:30", value: "07:30" },
  { label: "8:00", value: "08:00" },
  { label: "8:30", value: "08:30" },
  { label: "9:00より あと", value: "09:00" },
] as const;

export const SCHOOL_START_OPTIONS: ReadonlyArray<{
  label: string;
  value: SchoolStartPeriod;
}> = [
  { label: "1時間目から", value: "first_period" },
  { label: "2時間目から", value: "second_period" },
  { label: "3時間目から", value: "third_period" },
  { label: "給食から", value: "from_lunch" },
  { label: "午後から", value: "afternoon" },
  { label: "明日の朝に決める", value: "decide_morning" },
  { label: "休む予定", value: "absent" },
];

export const SUMMER_REVIEW_ITEMS = [
  "外出の予定",
  "学習(宿題・自由研究)",
  "休憩・遊び",
  "必要な物",
  "起きる時刻",
] as const;

export const SCHOOL_REVIEW_ITEMS = [
  "できたこと",
  "手伝ってもらったこと",
  "困ったこと",
  "明日に回すこと",
  "明日の予定",
] as const;

export type OutlookSheetKind =
  "today" | "today_item" | "bedtime" | "tomorrow_plan" | "tomorrow" | "start";

export function isSummerMode(mode: MusumeMode): boolean {
  return mode === "summer";
}

export function formatMusumeShortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TOKYO_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export function getSummerVacationDay(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return 1;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const currentDate = Date.UTC(year, month - 1, day);
  const summerStart = Date.UTC(
    year,
    SUMMER_VACATION_START_MONTH - 1,
    SUMMER_VACATION_START_DAY,
  );

  return Math.max(
    1,
    Math.floor((currentDate - summerStart) / MILLISECONDS_PER_DAY) + 1,
  );
}

export function isBeforeTokyoHour(hour: number, now = new Date()): boolean {
  const tokyoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TOKYO_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

  return tokyoHour < hour;
}

export function formatWakeUpTime(value: string): string {
  const option = WAKE_UP_OPTIONS.find((item) => item.value === value);
  return option?.label ?? value;
}

export function formatSchoolStartPeriod(value: SchoolStartPeriod): string {
  const option = SCHOOL_START_OPTIONS.find((item) => item.value === value);
  if (option) return option.label;
  if (value === "other") return "その他";
  return value;
}

function joinTitles(titles: string[]): string {
  return titles.join("・");
}

function withMamaRibbon(
  text: string,
  decidedWith: string | null | undefined,
): string {
  return decidedWith === "mama" ? `${text} ${MAMA_DECIDED_RIBBON}` : text;
}

function itemsAnswer(items: MusumePlan["items"]["today_task"]): {
  text: string;
  decided: boolean;
} {
  if (items.length === 0) {
    return { text: UNDECIDED_LABEL, decided: false };
  }
  const text = withMamaRibbon(
    joinTitles(items.map((item) => item.title)),
    items[0]?.decided_with,
  );
  return { text, decided: true };
}

export function getTodayAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  return itemsAnswer(plan.items.today_task);
}

export function getTodayItemsAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  return itemsAnswer(plan.items.today_item);
}

export function getBedtimeAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  return itemsAnswer(plan.items.bedtime);
}

export function getTomorrowPlanAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  return itemsAnswer(plan.items.tomorrow_plan);
}

export function getTomorrowItemsAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  return itemsAnswer(plan.items.tomorrow_item);
}

export function getStartAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  if (isSummerMode(plan.mode) && plan.wake_up_time) {
    return {
      text: withMamaRibbon(
        formatWakeUpTime(plan.wake_up_time),
        plan.start_decided_with,
      ),
      decided: true,
    };
  }
  if (!isSummerMode(plan.mode) && plan.school_start_period) {
    return {
      text: withMamaRibbon(
        formatSchoolStartPeriod(plan.school_start_period),
        plan.start_decided_with,
      ),
      decided: true,
    };
  }
  return { text: UNDECIDED_LABEL, decided: false };
}

export function getReflectionMode(plan: MusumePlan): "normal" | "summer" {
  return isSummerMode(plan.mode) ? "summer" : "normal";
}

export function isReviewCompleted(plan: MusumePlan): boolean {
  return plan.review.completed_at !== null;
}

export function formatSummaryItemLine(
  label: string,
  titles: string[],
  decidedWith: string | null | undefined,
): string {
  if (titles.length === 0) return `${label}: まだ決めてないよ`;
  const content = withMamaRibbon(joinTitles(titles), decidedWith);
  return `${label}: ${content}`;
}
