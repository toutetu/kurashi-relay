import {
  cancelTaskRecordResponseSchema,
  collectionsResponseSchema,
  rewardsSummaryResponseSchema,
  taskRecordResponseSchema,
  taskRecordsResponseSchema,
  tasksResponseSchema,
  type Member,
} from "./schemas/oshigotoSchema";
import { ApiError, apiGet, apiSend } from "./client";

export type CreateTaskRecordInput = {
  member: Member;
  task: string;
  date?: string;
  idempotency_key: string;
  source: "web";
  note?: string;
};

export async function getTasks(
  member: Member,
  date?: string,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({ member });
  if (date) search.set("date", date);
  const response = await apiGet<unknown>(
    `/api/tasks?${search.toString()}`,
    signal,
  );
  const parsed = tasksResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("おしごとのデータ形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function getTaskRecords(
  member: Member,
  date: string,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({ member, date });
  const response = await apiGet<unknown>(
    `/api/task-records?${search.toString()}`,
    signal,
  );
  const parsed = taskRecordsResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("きろく一覧のデータ形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function getRewardsSummary(
  member: Member,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({ member });
  const response = await apiGet<unknown>(
    `/api/rewards/summary?${search.toString()}`,
    signal,
  );
  const parsed = rewardsSummaryResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("ごほうびのデータ形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function getRewardCollections(
  member: Member,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({ member });
  const response = await apiGet<unknown>(
    `/api/rewards/collections?${search.toString()}`,
    signal,
  );
  const parsed = collectionsResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("コレクションのデータ形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function createTaskRecord(input: CreateTaskRecordInput) {
  const response = await apiSend<unknown>("/api/task-records", "POST", input);
  const parsed = taskRecordResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("おしごとの保存結果が正しくありません。", 200);
  }
  return {
    ...parsed.data.data,
    deduplicated: parsed.data.meta.deduplicated,
  };
}

export async function cancelTaskRecord(recordId: number) {
  const response = await apiSend<unknown>(
    `/api/task-records/${recordId}`,
    "DELETE",
  );
  const parsed = cancelTaskRecordResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("おしごとの取消結果が正しくありません。", 200);
  }
  return parsed.data.data;
}
