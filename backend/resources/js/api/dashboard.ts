import { ApiError, apiGet } from "./client";
import { dashboardResponseSchema } from "./schemas/dashboardSchema";
import type { DashboardData } from "../types/dashboard";

export async function getDashboard(
  date?: string,
  signal?: AbortSignal,
): Promise<DashboardData> {
  const search = date ? `?${new URLSearchParams({ date }).toString()}` : "";
  const response = await apiGet<unknown>(`/api/dashboard${search}`, signal);
  const parsed = dashboardResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new ApiError("ダッシュボードのデータ形式が正しくありません。", 200);
  }

  return parsed.data.data;
}
