import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const handoverSchema = z.object({
  id: z.number(),
  title: z.string(),
  assignee_label: z.string(),
  conditions_text: z.string(),
  completion_criteria: z.string(),
  result_text: z.string().nullable().optional(),
  returned_to_mother_at: z.string().nullable().optional(),
  status: z.string(),
  source_kind: z.string(),
  due_at: z.string().nullable().optional(),
  local_date: z.string().nullable().optional(),
});

const listSchema = z.object({
  status: z.literal("success"),
  data: z.array(handoverSchema),
});

const itemSchema = z.object({
  data: handoverSchema,
});

export type SupportHandover = z.infer<typeof handoverSchema>;

export type SupportHandoverInput = {
  title: string;
  assignee_label: string;
  conditions_text: string;
  completion_criteria: string;
  source_kind:
    | "child_statement"
    | "mother_confirmed"
    | "mother_observation"
    | "mother_assumption";
  status?: string;
  result_text?: string | null;
  local_date?: string;
};

export async function listSupportHandovers(date?: string) {
  const search = date ? `?${new URLSearchParams({ date }).toString()}` : "";
  const response = await apiGet<unknown>(`/api/support-handovers${search}`);
  const parsed = listSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("支援引き継ぎ一覧の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function createSupportHandover(input: SupportHandoverInput) {
  const response = await apiSend<unknown>("/api/support-handovers", "POST", input);
  const parsed = itemSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("支援引き継ぎの保存結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function updateSupportHandover(
  id: number,
  input: Partial<SupportHandoverInput> & { status?: string; result_text?: string | null },
) {
  const response = await apiSend<unknown>(
    `/api/support-handovers/${id}`,
    "PATCH",
    input,
  );
  const parsed = itemSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("支援引き継ぎの更新結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}
