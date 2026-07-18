import { ApiError, API_BASE_URL, apiGet, apiSend } from "../../../api/client";
import {
  musumePlanResponseSchema,
  musumeSummaryResponseSchema,
  type MusumeMode,
  type PlanItemCategory,
  type PlanState,
  type SchoolStartPeriod,
} from "./schemas/musumeSchema";

async function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      "APIに接続できませんでした。通信状態を確認してください。",
      0,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null
        ? (payload as { message?: string; errors?: Record<string, string[]> })
        : null;
    throw new ApiError(
      errorPayload?.message ?? "データの保存中に問題が発生しました。",
      response.status,
      errorPayload?.errors,
    );
  }

  if (payload === null) {
    throw new ApiError(
      "サーバーから正しいデータを受け取れませんでした。",
      response.status,
    );
  }

  return payload as T;
}

export type UpdateMusumePlanInput = {
  mode?: MusumeMode;
  school_start_period?: SchoolStartPeriod | null;
  wake_up_time?: string | null;
  today_state?: PlanState;
  tomorrow_items_state?: PlanState;
  start_state?: PlanState;
};

export type ReplaceMusumeItemsInput = {
  category: PlanItemCategory;
  titles: string[];
};

export type CompleteReflectionInput = {
  mode: "normal" | "summer";
  note?: string | null;
};

export async function getMusumePlan(date?: string, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (date) search.set("date", date);
  const query = search.toString();
  const response = await apiGet<unknown>(
    `/api/musume/plan${query ? `?${query}` : ""}`,
    signal,
  );
  const parsed = musumePlanResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("娘の見通しデータ形式が正しくありません。", 200);
  }
  return parsed.data;
}

export async function updateMusumePlan(id: number, body: UpdateMusumePlanInput) {
  const response = await apiSend<unknown>(`/api/musume/plan/${id}`, "PATCH", body);
  const parsed = musumePlanResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("娘の見通しの保存結果が正しくありません。", 200);
  }
  return parsed.data;
}

export async function replaceMusumeItems(
  planId: number,
  body: ReplaceMusumeItemsInput,
) {
  const response = await apiPut<unknown>(`/api/musume/plan/${planId}/items`, body);
  const parsed = musumePlanResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("娘の見通しの保存結果が正しくありません。", 200);
  }
  return parsed.data;
}

export async function completeMusumeReflection(
  planId: number,
  body: CompleteReflectionInput,
) {
  const response = await apiSend<unknown>(
    `/api/musume/plan/${planId}/reflection/complete`,
    "POST",
    body,
  );
  const parsed = musumePlanResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("振り返りの保存結果が正しくありません。", 200);
  }
  return parsed.data;
}

export async function getMusumeSummary(date?: string, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (date) search.set("date", date);
  const query = search.toString();
  const response = await apiGet<unknown>(
    `/api/koekake/musume-summary${query ? `?${query}` : ""}`,
    signal,
  );
  const parsed = musumeSummaryResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("むすめの見通しデータ形式が正しくありません。", 200);
  }
  return parsed.data;
}
