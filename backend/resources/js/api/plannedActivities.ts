import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const plannedActivitySchema = z.object({
  id: z.number(),
  subject: z.enum(["mother", "child"]).nullable().optional(),
  subject_member_id: z.number(),
  activity_definition_id: z.number().nullable(),
  activity_key: z.string().nullable().optional(),
  source_type: z.string(),
  title: z.string(),
  category: z.string().nullable().optional(),
  planned_start_at: z.string().nullable(),
  planned_end_at: z.string().nullable(),
  is_all_day: z.boolean(),
  local_date: z.string(),
  status: z.string(),
  editable: z.boolean(),
});

const listResponseSchema = z.object({
  status: z.literal("success"),
  data: z.array(plannedActivitySchema),
});

const itemResponseSchema = z.object({
  status: z.literal("success"),
  data: plannedActivitySchema,
});

const optionSchema = z.object({
  id: z.number(),
  activity_key: z.string(),
  name: z.string(),
  quick_label: z.string().nullable().optional(),
  kind: z.string(),
  category: z.string().nullable().optional(),
});

const optionsResponseSchema = z.object({
  status: z.literal("success"),
  data: z.array(optionSchema),
});

export type PlannedActivity = z.infer<typeof plannedActivitySchema>;
export type ActivityOption = z.infer<typeof optionSchema>;

export type CreatePlannedActivityInput = {
  subject: "mother" | "child";
  title: string;
  local_date: string;
  activity_definition_id?: number | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  is_all_day?: boolean;
  category_snapshot?: string | null;
};

export async function getPlannedActivities(
  date: string,
  subject?: "mother" | "child",
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({ date });
  if (subject) search.set("subject", subject);
  const response = await apiGet<unknown>(
    `/api/planned-activities?${search.toString()}`,
    signal,
  );
  const parsed = listResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("予定一覧のデータ形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function getPlannedActivityOptions(signal?: AbortSignal) {
  const response = await apiGet<unknown>(
    "/api/planned-activities/options",
    signal,
  );
  const parsed = optionsResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("活動マスタのデータ形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function createPlannedActivity(input: CreatePlannedActivityInput) {
  const response = await apiSend<unknown>(
    "/api/planned-activities",
    "POST",
    input,
  );
  const parsed = itemResponseSchema.safeParse(response);
  if (!parsed.success) {
    // Resource may wrap as { data: {...} } without nested success on data key
    const alt = z
      .object({ data: plannedActivitySchema })
      .safeParse(response);
    if (alt.success) return alt.data.data;
    throw new ApiError("予定の保存結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function cancelPlannedActivity(id: number) {
  const response = await apiSend<unknown>(
    `/api/planned-activities/${id}`,
    "DELETE",
  );
  const parsed = itemResponseSchema.safeParse(response);
  if (!parsed.success) {
    const alt = z
      .object({ data: plannedActivitySchema })
      .safeParse(response);
    if (alt.success) return alt.data.data;
    throw new ApiError("予定の取消結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}
