import { z } from "zod";

export const musumeModeSchema = z.enum(["school", "summer", "holiday", "outing"]);

export const planStateSchema = z.enum(["undecided", "with_mama", "decided"]);

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
  "tomorrow_item",
  "memo",
]);

export const planItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  sort_order: z.number().int(),
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
  today_state: planStateSchema,
  tomorrow_items_state: planStateSchema,
  start_state: planStateSchema,
  review: planReviewSchema,
  items: z.object({
    today_task: z.array(planItemSchema),
    tomorrow_item: z.array(planItemSchema),
    memo: z.array(planItemSchema),
  }),
});

export const musumePlanResponseSchema = z.object({
  plan: musumePlanSchema,
});

export const musumeSummarySchema = z.object({
  mode: musumeModeSchema,
  today_tasks: z.array(z.string()),
  tomorrow_items: z.array(z.string()),
  wake_up_time: z.string().nullable(),
  school_start_period: schoolStartPeriodSchema.nullable(),
  today_state: planStateSchema,
  tomorrow_items_state: planStateSchema,
  start_state: planStateSchema,
  review_completed_at: z.string().nullable(),
});

export const musumeSummaryResponseSchema = z.object({
  summary: musumeSummarySchema.nullable(),
});

export type MusumeMode = z.infer<typeof musumeModeSchema>;
export type PlanState = z.infer<typeof planStateSchema>;
export type SchoolStartPeriod = z.infer<typeof schoolStartPeriodSchema>;
export type PlanItemCategory = z.infer<typeof planItemCategorySchema>;
export type MusumePlan = z.infer<typeof musumePlanSchema>;
export type MusumePlanResponse = z.infer<typeof musumePlanResponseSchema>;
export type MusumeSummary = z.infer<typeof musumeSummarySchema>;
export type MusumeSummaryResponse = z.infer<typeof musumeSummaryResponseSchema>;
