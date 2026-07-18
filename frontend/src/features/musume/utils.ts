import type {
  MusumeMode,
  MusumePlan,
  MusumeSummary,
  PlanState,
  SchoolStartPeriod,
} from "./api/schemas/musumeSchema";

const TOKYO_TIME_ZONE = "Asia/Tokyo";

export const WITH_MAMA_LABEL = "🎀 ママと決める";
export const UNDECIDED_LABEL = "タップして決めよう";

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

export const SUMMER_TOMORROW_CHIPS = [
  "水筒",
  "ぼうし",
  "宿題",
  "財布",
  "ハンカチ",
  "その他",
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

export type OutlookSheetKind = "today" | "tomorrow" | "start";

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

function stateAnswer(state: PlanState, decidedText: string): string {
  if (state === "with_mama") return WITH_MAMA_LABEL;
  if (state === "decided") return decidedText;
  return UNDECIDED_LABEL;
}

export function getTodayAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  const text = stateAnswer(
    plan.today_state,
    joinTitles(plan.items.today_task.map((item) => item.title)),
  );
  return { text, decided: plan.today_state !== "undecided" };
}

export function getTomorrowItemsAnswer(plan: MusumePlan): {
  text: string;
  decided: boolean;
} {
  const text = stateAnswer(
    plan.tomorrow_items_state,
    joinTitles(plan.items.tomorrow_item.map((item) => item.title)),
  );
  return { text, decided: plan.tomorrow_items_state !== "undecided" };
}

export function getStartAnswer(plan: MusumePlan): { text: string; decided: boolean } {
  if (plan.start_state === "with_mama") {
    return { text: WITH_MAMA_LABEL, decided: true };
  }
  if (plan.start_state === "decided") {
    if (isSummerMode(plan.mode) && plan.wake_up_time) {
      return { text: formatWakeUpTime(plan.wake_up_time), decided: true };
    }
    if (!isSummerMode(plan.mode) && plan.school_start_period) {
      return {
        text: formatSchoolStartPeriod(plan.school_start_period),
        decided: true,
      };
    }
  }
  return { text: UNDECIDED_LABEL, decided: false };
}

export function getReflectionMode(plan: MusumePlan): "normal" | "summer" {
  return isSummerMode(plan.mode) ? "summer" : "normal";
}

export function isReviewCompleted(plan: MusumePlan): boolean {
  return plan.review.completed_at !== null;
}

export function getSummaryStartLabel(summary: MusumeSummary): string | null {
  if (isSummerMode(summary.mode) && summary.wake_up_time) {
    return `⏰ ${formatWakeUpTime(summary.wake_up_time)}`;
  }
  if (!isSummerMode(summary.mode) && summary.school_start_period) {
    return `🕒 ${formatSchoolStartPeriod(summary.school_start_period)}`;
  }
  if (summary.start_state === "with_mama") {
    return WITH_MAMA_LABEL;
  }
  return null;
}
