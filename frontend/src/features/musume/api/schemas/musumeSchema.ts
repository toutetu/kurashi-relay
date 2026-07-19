import { z } from "zod";

export const musumeModeSchema = z.enum([
  "school",
  "summer",
  "holiday",
  "outing",
]);

export const decidedWithSchema = z.enum(["mama"]);

export const schoolStartPeriodSchema = z.enum([
  "first_period",
  "second_period",
  "third_period",
  "from_lunch",
  "afternoon",
  "decide_morning",
  "absent",
  "other",
]);

export const planItemCategorySchema = z.enum([
  "today_task",
  "today_item",
  "bedtime",
  "tomorrow_plan",
  "tomorrow_item",
  "memo",
]);

export const planItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  sort_order: z.number().int(),
  decided_with: decidedWithSchema.nullable(),
});

export const planReviewSchema = z.object({
  mode: z.enum(["normal", "summer"]),
  completed_at: z.string().nullable(),
});

export const musumePlanSchema = z.object({
  id: z.number().int(),
  plan_date: z.string(),
  mode: musumeModeSchema,
  school_start_period: schoolStartPeriodSchema.nullable(),
  wake_up_time: z.string().nullable(),
  start_decided_with: decidedWithSchema.nullable(),
  review: planReviewSchema,
  items: z.object({
    today_task: z.array(planItemSchema),
    today_item: z.array(planItemSchema),
    bedtime: z.array(planItemSchema),
    tomorrow_plan: z.array(planItemSchema),
    tomorrow_item: z.array(planItemSchema),
    memo: z.array(planItemSchema),
  }),
});

export const musumePlanResponseSchema = z.object({
  plan: musumePlanSchema,
});

export const musumeSummaryDecidedWithSchema = z.object({
  today: decidedWithSchema.nullable(),
  tomorrow_plan: decidedWithSchema.nullable(),
  tomorrow_item: decidedWithSchema.nullable(),
  start: decidedWithSchema.nullable(),
});

export const musumeSummarySchema = z.object({
  mode: musumeModeSchema,
  today_tasks: z.array(z.string()),
  tomorrow_plans: z.array(z.string()),
  tomorrow_items: z.array(z.string()),
  wake_up_time: z.string().nullable(),
  school_start_period: schoolStartPeriodSchema.nullable(),
  decided_with: musumeSummaryDecidedWithSchema,
  review_completed_at: z.string().nullable(),
});

export const musumeSummaryResponseSchema = z.object({
  summary: musumeSummarySchema.nullable(),
});

export type MusumeMode = z.infer<typeof musumeModeSchema>;
export type DecidedWith = z.infer<typeof decidedWithSchema>;
export type SchoolStartPeriod = z.infer<typeof schoolStartPeriodSchema>;
export type PlanItemCategory = z.infer<typeof planItemCategorySchema>;
export type MusumePlan = z.infer<typeof musumePlanSchema>;
export type MusumePlanResponse = z.infer<typeof musumePlanResponseSchema>;
export type MusumeSummary = z.infer<typeof musumeSummarySchema>;
export type MusumeSummaryResponse = z.infer<typeof musumeSummaryResponseSchema>;
