import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const reportSchema = z.object({
  id: z.number(),
  audience: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  title: z.string(),
  payload: z.unknown(),
  excludes_last_war: z.boolean(),
  share_token: z.string().nullable().optional(),
  share_expires_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

const listSchema = z.object({
  status: z.literal("success"),
  data: z.array(reportSchema),
});

const itemSchema = z.object({
  data: reportSchema,
});

export type ReportSnapshot = z.infer<typeof reportSchema>;

export async function listReports() {
  const response = await apiGet<unknown>("/api/reports");
  const parsed = listSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("レポート一覧の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function createReport(input: {
  audience: "school" | "support_agency" | "family";
  period_start: string;
  period_end: string;
  title?: string;
}) {
  const response = await apiSend<unknown>("/api/reports", "POST", input);
  const parsed = itemSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("レポート作成結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function shareReport(id: number) {
  const response = await apiSend<unknown>(`/api/reports/${id}/share`, "POST");
  const parsed = itemSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("共有リンク作成結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}
