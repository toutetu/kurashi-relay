import { z } from "zod";
import { ApiError, apiGet } from "./client";
import type {
  ScheduleComparisonItem,
  ScheduleImpactSummary,
} from "../types/dashboard";

const responseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    date: z.string(),
    comparisons: z.array(z.unknown()),
    summary: z.record(z.string(), z.unknown()),
  }),
});

export async function getScheduleComparisons(
  date: string,
  signal?: AbortSignal,
): Promise<{
  date: string;
  comparisons: ScheduleComparisonItem[];
  summary: ScheduleImpactSummary;
}> {
  const response = await apiGet<unknown>(
    `/api/schedule-comparisons?${new URLSearchParams({ date }).toString()}`,
    signal,
  );
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("予定と実績の比較データの形式が正しくありません。", 200);
  }

  return {
    date: parsed.data.data.date,
    comparisons: parsed.data.data.comparisons as ScheduleComparisonItem[],
    summary: parsed.data.data.summary as ScheduleImpactSummary,
  };
}
