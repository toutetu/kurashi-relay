import type {
  CompletionStatus,
  KoekakePhase,
  KoekakeTaskSummary,
} from "../../api/schemas/koekakeSchema";

export const KOEKAKE_PHASE_TABS = [
  { value: "morning" as const, label: "朝" },
  { value: "evening" as const, label: "夕方" },
  { value: "night" as const, label: "夜" },
];

export const COMPLETION_STATUS_LABELS: Record<CompletionStatus, string> = {
  completed: "完了",
  partial: "一部",
  together: "一緒に",
  parent_done: "代行",
  deferred: "後日",
  unknown: "未確認",
};

export function getTokyoHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

export function getInitialKoekakePhase(now = new Date()): KoekakePhase {
  const hour = getTokyoHour(now);
  if (hour >= 4 && hour <= 10) return "morning";
  if (hour >= 11 && hour <= 17) return "evening";
  return "night";
}

export function isKoekakeTaskDue(task: KoekakeTaskSummary, now = new Date()): boolean {
  if (task.completion) return false;
  if (task.next_remind_at && new Date(task.next_remind_at) < now) return true;
  if (
    task.prompt_count === 0 &&
    task.scheduled_at &&
    new Date(task.scheduled_at) < now
  ) {
    return true;
  }
  return false;
}

export function buildDefaultPromptPayload(task: KoekakeTaskSummary): {
  prompt_text: string;
  source: "template" | "custom";
} {
  if (task.suggested_prompt?.text) {
    return {
      prompt_text: task.suggested_prompt.text,
      source: "template",
    };
  }
  return {
    prompt_text: task.name,
    source: "custom",
  };
}
