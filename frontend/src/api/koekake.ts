import { ApiError, apiGet, apiSend } from "./client";
import {
  cancelPromptEventResponseSchema,
  createPromptEventResponseSchema,
  koekakeTaskDetailSchema,
  koekakeTasksResponseSchema,
  snoozeResponseSchema,
  updateCompletionResponseSchema,
  type CompletionStatus,
  type KoekakePhase,
  type PromptSource,
} from "./schemas/koekakeSchema";

export type CreatePromptEventInput = {
  daily_task_id: number;
  prompt_text: string;
  source: PromptSource;
  idempotency_key: string;
};

export type UpdateCompletionInput = {
  status: CompletionStatus;
  note?: string | null;
};

export type SnoozeInput =
  | { minutes: 5 | 10 | 15 }
  | { none_today: true };

export async function getKoekakeTasks(
  date?: string,
  phase?: KoekakePhase,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams();
  if (date) search.set("date", date);
  if (phase) search.set("phase", phase);
  const query = search.toString();
  const response = await apiGet<unknown>(
    `/api/koekake/tasks${query ? `?${query}` : ""}`,
    signal,
  );
  const parsed = koekakeTasksResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("声かけのデータ形式が正しくありません。", 200);
  }
  return parsed.data;
}

export async function getKoekakeTask(id: number, signal?: AbortSignal) {
  const response = await apiGet<unknown>(`/api/koekake/tasks/${id}`, signal);
  const parsed = koekakeTaskDetailSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("声かけの詳細データ形式が正しくありません。", 200);
  }
  return parsed.data;
}

export async function createPromptEvent(body: CreatePromptEventInput) {
  const response = await apiSend<unknown>(
    "/api/koekake/prompt-events",
    "POST",
    body,
  );
  const parsed = createPromptEventResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("声かけの保存結果が正しくありません。", 200);
  }
  return parsed.data;
}

export async function cancelPromptEvent(id: number) {
  const response = await apiSend<unknown>(
    `/api/koekake/prompt-events/${id}`,
    "DELETE",
  );
  const parsed = cancelPromptEventResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("声かけの取消結果が正しくありません。", 200);
  }
  return parsed.data;
}

export async function updateCompletion(id: number, body: UpdateCompletionInput) {
  const response = await apiSend<unknown>(
    `/api/koekake/tasks/${id}/completion`,
    "PATCH",
    body,
  );
  const parsed = updateCompletionResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("行動結果の保存が正しくありません。", 200);
  }
  return parsed.data;
}

export async function snooze(id: number, body: SnoozeInput) {
  const response = await apiSend<unknown>(
    `/api/koekake/tasks/${id}/snooze`,
    "POST",
    body,
  );
  const parsed = snoozeResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("再通知の保存結果が正しくありません。", 200);
  }
  return parsed.data;
}
