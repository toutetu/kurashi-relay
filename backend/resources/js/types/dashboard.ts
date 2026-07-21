export type ActivityCategory =
  | "work_preparation"
  | "housework"
  | "school_support"
  | "waiting"
  | "recovery"
  | "last_war";

export type ActivityStatus = "idle" | "running" | "paused" | "completed";

export interface CurrentActivity {
  id: string;
  eventId: number;
  activityDefinitionId: number;
  plannedActivityId?: number | null;
  title: string;
  category: ActivityCategory;
  startedAt: string;
  status: ActivityStatus;
  relatedPlanTitle?: string | null;
}

export interface QuickActivityOption {
  id: string;
  label: string;
  category: ActivityCategory;
  source: "preset" | "google";
  activityDefinitionId: number;
  plannedActivityId: number | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
}

export interface SchedulePlan {
  id: string;
  startAt: string;
  endAt: string;
  title: string;
  category: ActivityCategory;
  source?: "google" | "manual";
  status?: string;
  details?: string[];
  /** done=完了済み / skipped=中止。あるとグレーアウト */
  outcome?: "done" | "skipped" | null;
  recordable?: boolean;
  /** 予定の対象人物。娘はホーム「今日の予定」で水色カバー表示 */
  subjectRole?: "mother" | "child";
}

export type QuickLogType =
  | "wake_prompt"
  | "change_clothes_prompt"
  | "school_contact"
  | "stomachache_support"
  | "transport"
  | "school_handoff";

export interface QuickLog {
  type: QuickLogType;
  label: string;
  count: number;
  activityDefinitionId?: number | null;
}

export type Score = 1 | 2 | 3 | 4 | 5;

export type ConditionInputSource =
  "self" | "guardian_confirmed" | "guardian_observation";

export interface ConditionState {
  physical: Score;
  mood: Score;
  inputSource: ConditionInputSource;
}

export interface Conditions {
  mother: ConditionState;
  daughter: ConditionState;
}

export interface ChildStrategy {
  desiredOutcome: string;
  firstStep: string;
  requestedSupports: string[];
  fallbackPlans: string[];
  confidence: string;
  note?: string;
}

export interface TimeBalance {
  sleepMinutes: number;
  waitingMinutes: number;
  activityMinutes: number;
  recoveryMinutes: number;
}

export interface ScheduleImpactCause {
  label: string;
  minutes: number;
}

export interface ScheduleImpactSummary {
  onScheduleCount: number;
  delayedCount: number;
  interruptedCount: number;
  cancelledCount: number;
  movedToNightCount: number;
  lostMinutes: number;
  mainCauses: ScheduleImpactCause[];
}

export interface ActionItem {
  id: string;
  title: string;
  assignee: string;
  dueAt: string;
  status: string;
  priority: "high" | "medium" | "low";
}

export interface LastWarProgress {
  gameName: string;
  plannedTasks: string[];
  completedCount: number;
  totalCount: number;
  playMinutes: number;
  recoveryEffect: number;
}

export type ActualKind = "sleep" | "activity" | "waiting" | "recovery";

export interface ActualEntry {
  id: string;
  title: string;
  kind: ActualKind;
  category: string;
  startAt: string;
  endAt: string;
  details: string[];
}

export type DifferenceStatus =
  | "on_schedule"
  | "delayed"
  | "interrupted"
  | "cancelled"
  | "moved_to_night"
  | "unplanned_activity"
  | "no_plan_no_record";

export interface ScheduleDifference {
  status: DifferenceStatus;
  startDelayMinutes: number;
  plannedMinutes: number;
  actualMinutes: number;
  interruptionCount: number;
  lostMinutes: number;
  causes: string[];
}

export interface ScheduleComparisonItem {
  timeRange: { start: string; end: string };
  plan: SchedulePlan | null;
  actuals: ActualEntry[];
  difference: ScheduleDifference;
}

export interface DashboardData {
  date: string;
  currentActivity: CurrentActivity | null;
  nextPlans: SchedulePlan[];
  quickActivities: QuickActivityOption[];
  quickLogs: QuickLog[];
  conditions: Conditions;
  childStrategy: ChildStrategy;
  timeBalance: TimeBalance;
  scheduleImpactSummary: ScheduleImpactSummary;
  actionItems: ActionItem[];
  lastWar: LastWarProgress;
  scheduleComparisons: ScheduleComparisonItem[];
}

export interface DashboardResponse {
  status: "success";
  data: DashboardData;
  meta: {
    timezone: string;
  };
}

export interface ApiErrorPayload {
  status?: "error";
  message?: string;
  errors?: Record<string, string[]>;
}
