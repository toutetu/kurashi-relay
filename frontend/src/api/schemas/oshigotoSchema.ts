import { z } from "zod";

export const memberSchema = z.enum(["child", "mother"]);

export const summarySchema = z.object({
  member: memberSchema,
  date: z.string(),
  today_done_count: z.number().int(),
  lifetime_count: z.number().int(),
  gauge_count: z.number().int(),
  gauge_size: z.number().int().positive(),
  full_count: z.number().int(),
  coins: z.number().int().nullable(),
  points: z.number().int().nullable(),
  collections_count: z.number().int(),
});

export const taskSchema = z.object({
  slug: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  point_value: z.number().int(),
  sort_order: z.number().int(),
  count: z.number().int(),
  last_record_id: z.number().int().nullable(),
});

export const tasksDataSchema = z.object({
  date: z.string(),
  member: memberSchema,
  tasks: z.array(taskSchema),
  summary: summarySchema,
});

const timezoneMetaSchema = z.object({
  timezone: z.string(),
});

export const tasksResponseSchema = z.object({
  status: z.literal("success"),
  data: tasksDataSchema,
  meta: timezoneMetaSchema,
});

export const revealedRewardSchema = z.object({
  type: z.enum(["zombie", "sweet"]),
  item_slug: z.string(),
  milestone_number: z.number().int().positive(),
  obtained_on: z.string(),
});

export const taskRecordSchema = z.object({
  id: z.number().int(),
  member: memberSchema,
  task: z.string(),
  task_title: z.string(),
  record_date: z.string(),
  completed_at: z.string(),
  cancelled_at: z.string().nullable(),
});

export const taskRecordsDataSchema = z.object({
  date: z.string(),
  member: memberSchema,
  records: z.array(taskRecordSchema),
});

export const taskRecordsResponseSchema = z.object({
  status: z.literal("success"),
  data: taskRecordsDataSchema,
  meta: timezoneMetaSchema,
});

export const taskRecordResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    record: taskRecordSchema,
    summary: summarySchema,
    revealed_reward: revealedRewardSchema.nullable(),
  }),
  meta: timezoneMetaSchema.extend({
    deduplicated: z.boolean(),
  }),
});

export const cancelTaskRecordResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    record: taskRecordSchema,
    summary: summarySchema,
  }),
  meta: timezoneMetaSchema,
});

export const rewardsSummaryResponseSchema = z.object({
  status: z.literal("success"),
  data: summarySchema,
  meta: timezoneMetaSchema,
});

export const collectionsResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    member: memberSchema,
    collections: z.array(revealedRewardSchema),
  }),
  meta: timezoneMetaSchema,
});

export type Member = z.infer<typeof memberSchema>;
export type RewardSummary = z.infer<typeof summarySchema>;
export type ApiTask = z.infer<typeof taskSchema>;
export type TasksData = z.infer<typeof tasksDataSchema>;
export type RevealedReward = z.infer<typeof revealedRewardSchema>;
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export type TaskRecordsData = z.infer<typeof taskRecordsDataSchema>;
