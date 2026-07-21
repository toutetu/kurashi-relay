import { z } from "zod";
import type { DashboardResponse } from "../../types/dashboard";

const identifier = z.string().min(1);
const nonNegativeInteger = z.number().int().nonnegative();
const isoDateTime = z.iso.datetime({ offset: true });

const activityCategory = z.enum([
  "work_preparation",
  "housework",
  "school_support",
  "waiting",
  "recovery",
  "last_war",
]);

const currentActivity = z.strictObject({
  id: identifier,
  eventId: z.number().int().positive(),
  activityDefinitionId: z.number().int().positive(),
  plannedActivityId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1),
  category: activityCategory,
  startedAt: isoDateTime,
  status: z.enum(["idle", "running", "paused", "completed"]),
  relatedPlanTitle: z.string().nullable().optional(),
});

const quickActivity = z.strictObject({
  id: identifier,
  label: z.string().min(1),
  category: activityCategory,
  source: z.enum(["preset", "google"]),
  activityDefinitionId: z.number().int().positive(),
  plannedActivityId: z.number().int().positive().nullable(),
  plannedStartAt: isoDateTime.nullable(),
  plannedEndAt: isoDateTime.nullable(),
});

const schedulePlan = z.strictObject({
  id: identifier,
  startAt: isoDateTime,
  endAt: isoDateTime,
  title: z.string().min(1),
  category: activityCategory,
  source: z.enum(["google", "manual"]).optional(),
  status: z.string().min(1).optional(),
  details: z.array(z.string()).optional(),
  outcome: z.enum(["done", "skipped"]).nullable().optional(),
  recordable: z.boolean().optional(),
  subjectRole: z.enum(["mother", "child"]).optional(),
});

const quickLog = z.strictObject({
  type: z.enum([
    "wake_prompt",
    "change_clothes_prompt",
    "school_contact",
    "stomachache_support",
    "transport",
    "school_handoff",
  ]),
  label: z.string().min(1),
  count: nonNegativeInteger,
  activityDefinitionId: z.number().int().nullable().optional(),
});

const score = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const condition = z.strictObject({
  physical: score,
  mood: score,
  inputSource: z.enum(["self", "guardian_confirmed", "guardian_observation"]),
});

const childStrategy = z.strictObject({
  desiredOutcome: z.string(),
  firstStep: z.string(),
  requestedSupports: z.array(z.string()),
  fallbackPlans: z.array(z.string()),
  confidence: z.string().min(1),
  note: z.string().optional(),
});

const timeBalance = z.strictObject({
  sleepMinutes: nonNegativeInteger,
  waitingMinutes: nonNegativeInteger,
  activityMinutes: nonNegativeInteger,
  recoveryMinutes: nonNegativeInteger,
});

const scheduleImpactSummary = z.strictObject({
  onScheduleCount: nonNegativeInteger,
  delayedCount: nonNegativeInteger,
  interruptedCount: nonNegativeInteger,
  cancelledCount: nonNegativeInteger,
  movedToNightCount: nonNegativeInteger,
  lostMinutes: nonNegativeInteger,
  mainCauses: z.array(
    z.strictObject({
      label: z.string().min(1),
      minutes: nonNegativeInteger,
    }),
  ),
});

const actionItem = z.strictObject({
  id: identifier,
  title: z.string().min(1),
  assignee: z.string().min(1),
  dueAt: isoDateTime,
  status: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
});

const lastWar = z.strictObject({
  gameName: z.string().min(1),
  plannedTasks: z.array(z.string()),
  completedCount: nonNegativeInteger,
  totalCount: nonNegativeInteger,
  playMinutes: nonNegativeInteger,
  recoveryEffect: nonNegativeInteger,
});

const actualEntry = z.strictObject({
  id: identifier,
  title: z.string().min(1),
  kind: z.enum(["sleep", "activity", "waiting", "recovery"]),
  category: z.string().min(1),
  startAt: isoDateTime,
  endAt: isoDateTime,
  details: z.array(z.string()),
});

const scheduleDifference = z.strictObject({
  status: z.enum([
    "on_schedule",
    "delayed",
    "interrupted",
    "cancelled",
    "moved_to_night",
    "unplanned_activity",
    "no_plan_no_record",
  ]),
  startDelayMinutes: nonNegativeInteger,
  plannedMinutes: nonNegativeInteger,
  actualMinutes: nonNegativeInteger,
  interruptionCount: nonNegativeInteger,
  lostMinutes: nonNegativeInteger,
  causes: z.array(z.string()),
});

const scheduleComparison = z.strictObject({
  timeRange: z.strictObject({
    start: isoDateTime,
    end: isoDateTime,
  }),
  plan: schedulePlan.nullable(),
  actuals: z.array(actualEntry),
  difference: scheduleDifference,
});

export const dashboardResponseSchema: z.ZodType<DashboardResponse> =
  z.strictObject({
    status: z.literal("success"),
    data: z.strictObject({
      date: z.iso.date(),
      currentActivity: currentActivity.nullable(),
      nextPlans: z.array(schedulePlan),
      quickActivities: z.array(quickActivity),
      quickLogs: z.array(quickLog),
      conditions: z.strictObject({
        mother: condition,
        daughter: condition,
      }),
      childStrategy,
      timeBalance,
      scheduleImpactSummary,
      actionItems: z.array(actionItem),
      lastWar,
      scheduleComparisons: z.array(scheduleComparison),
    }),
    meta: z.strictObject({
      timezone: z.literal("Asia/Tokyo"),
    }),
  });
