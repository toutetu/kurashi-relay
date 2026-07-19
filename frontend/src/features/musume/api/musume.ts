import { ApiError, apiGet, apiSend } from "../../../api/client";
import {
  musumePlanResponseSchema,
  musumeSummaryResponseSchema,
  type DecidedWith,
  type MusumeMode,
  type PlanItemCategory,
  type SchoolStartPeriod,
} from "./schemas/musumeSchema";

export type UpdateMusumePlanInput = {
  mode?: MusumeMode;
  school_start_period?: SchoolStartPeriod | null;
  wake_up_time?: string | null;
  start_decided_with?: DecidedWith | null;
};

export type ReplaceMusumeItemsInput = {
  category: PlanItemCategory;
  titles: string[];
  decided_with?: DecidedWith | null;
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

export async function updateMusumePlan(
  id: number,
  body: UpdateMusumePlanInput,
) {
  const response = await apiSend<unknown>(
    `/api/musume/plan/${id}`,
    "PATCH",
    body,
  );
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
  const response = await apiSend<unknown>(
    `/api/musume/plan/${planId}/items`,
    "PUT",
    body,
  );
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
