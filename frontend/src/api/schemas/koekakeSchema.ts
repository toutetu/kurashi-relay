import { z } from "zod";

export const koekakePhaseSchema = z.enum(["morning", "evening", "night", "anytime"]);

export const promptSourceSchema = z.enum(["template", "edited", "custom"]);

export const completionStatusSchema = z.enum([
  "completed",
  "partial",
  "together",
  "parent_done",
  "deferred",
  "unknown",
]);

const promptLevelSchema = z.number().int().min(1).max(3);

export const suggestedPromptSchema = z.object({
  prompt_template_id: z.number().int(),
  level: promptLevelSchema,
  text: z.string(),
});

export const completionSchema = z.object({
  status: completionStatusSchema,
  completed_at: z.string(),
  note: z.string().nullable(),
});

export const koekakeTaskSummarySchema = z.object({
  id: z.number().int(),
  activity_key: z.string().nullable(),
  phase: koekakePhaseSchema,
  name: z.string(),
  icon: z.string(),
  status: z.string(),
  scheduled_at: z.string().nullable(),
  prompt_count: z.number().int(),
  latest_prompt_at: z.string().nullable(),
  next_remind_at: z.string().nullable(),
  suggested_prompt: suggestedPromptSchema.nullable(),
  completion: completionSchema.nullable(),
});

export const koekakeTasksResponseSchema = z.object({
  date: z.string(),
  tasks: z.array(koekakeTaskSummarySchema),
});

export const promptHistoryItemSchema = z.object({
  id: z.number().int(),
  prompted_at: z.string(),
  prompt_text: z.string(),
  source: promptSourceSchema,
});

export const promptCandidateItemSchema = z.object({
  prompt_template_id: z.number().int(),
  text: z.string(),
  is_preferred: z.boolean(),
});

export const promptCandidateGroupSchema = z.object({
  level: promptLevelSchema,
  items: z.array(promptCandidateItemSchema),
});

export const reminderItemSchema = z.object({
  id: z.number().int(),
  remind_at: z.string(),
});

export const koekakeTaskDetailSchema = koekakeTaskSummarySchema.extend({
  prompts: z.array(promptHistoryItemSchema),
  prompt_candidates: z.array(promptCandidateGroupSchema),
  reminders: z.array(reminderItemSchema),
});

export const createPromptEventResponseSchema = z.object({
  prompt_event_id: z.number().int(),
  daily_task_id: z.number().int(),
  prompt_count: z.number().int(),
  latest_prompt_at: z.string().nullable(),
  suggested_prompt: suggestedPromptSchema.nullable(),
});

export const cancelPromptEventResponseSchema = z.object({
  daily_task_id: z.number().int(),
  prompt_count: z.number().int(),
  latest_prompt_at: z.string().nullable(),
});

export const updateCompletionResponseSchema = z.object({
  task_id: z.number().int(),
  status: completionStatusSchema,
  completion: completionSchema,
});

export const snoozeResponseSchema = z.object({
  task_id: z.number().int(),
  next_remind_at: z.string().nullable(),
});

export type KoekakePhase = z.infer<typeof koekakePhaseSchema>;
export type PromptSource = z.infer<typeof promptSourceSchema>;
export type CompletionStatus = z.infer<typeof completionStatusSchema>;
export type SuggestedPrompt = z.infer<typeof suggestedPromptSchema>;
export type KoekakeCompletion = z.infer<typeof completionSchema>;
export type KoekakeTaskSummary = z.infer<typeof koekakeTaskSummarySchema>;
export type KoekakeTaskDetail = z.infer<typeof koekakeTaskDetailSchema>;
export type CreatePromptEventResponse = z.infer<
  typeof createPromptEventResponseSchema
>;
export type CancelPromptEventResponse = z.infer<
  typeof cancelPromptEventResponseSchema
>;
export type UpdateCompletionResponse = z.infer<
  typeof updateCompletionResponseSchema
>;
export type SnoozeResponse = z.infer<typeof snoozeResponseSchema>;
