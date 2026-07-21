import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const quickLogSchema = z.object({
  type: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  activity_definition_id: z.number().nullable().optional(),
});

const eventSchema = z.object({
  id: z.number(),
  activity_definition_id: z.number(),
  label: z.string().nullable().optional(),
  occurred_at: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
  cancelled: z.boolean().optional(),
});

const eventResponseSchema = z.object({
  data: eventSchema,
});

export type HomeQuickLog = z.infer<typeof quickLogSchema>;

export async function createHomeEvent(input: {
  activity_definition_id?: number;
  planned_activity_id?: number;
  idempotency_key: string;
  occurred_at?: string;
  ended_at?: string;
}) {
  const response = await apiSend<unknown>("/api/home/events", "POST", input);
  const parsed = eventResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("クイック記録の保存結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function completeHomeEvent(id: number, endedAt: string) {
  const response = await apiSend<unknown>(
    `/api/home/events/${id}/complete`,
    "PATCH",
    { ended_at: endedAt },
  );
  const parsed = eventResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("活動終了の保存結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function updateHomeEvent(
  id: number,
  input: { occurred_at?: string; ended_at?: string | null },
) {
  const response = await apiSend<unknown>(
    `/api/home/events/${id}`,
    "PATCH",
    input,
  );
  const parsed = eventResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("実績の修正結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function cancelHomeEvent(id: number) {
  const response = await apiSend<unknown>(`/api/home/events/${id}`, "DELETE");
  const parsed = eventResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("クイック記録の取消結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function skipHomePlan(plannedActivityId: number) {
  const response = await apiSend<unknown>(
    `/api/home/plans/${plannedActivityId}/skip`,
    "POST",
  );
  const parsed = z
    .object({
      status: z.literal("success").optional(),
      data: z.object({ id: z.number() }).passthrough(),
    })
    .safeParse(response);
  if (!parsed.success) {
    throw new ApiError("予定の「実施せず」の保存形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function getHomeQuickLogs(date: string, signal?: AbortSignal) {
  const response = await apiGet<unknown>(
    `/api/home/quick-logs?${new URLSearchParams({ date }).toString()}`,
    signal,
  );
  const parsed = z
    .object({ status: z.literal("success"), data: z.array(quickLogSchema) })
    .safeParse(response);
  if (!parsed.success) {
    throw new ApiError("クイック記録一覧の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}
