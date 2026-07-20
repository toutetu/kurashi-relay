import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const settingsSchema = z.object({
  day_type: z.enum(["weekday", "holiday", "long_vacation"]),
  report_exclude_last_war: z.boolean(),
  display_note: z.string().nullable().optional(),
});

const responseSchema = z.object({
  data: settingsSchema,
});

export type FamilySettings = z.infer<typeof settingsSchema>;

export async function getFamilySettings(signal?: AbortSignal) {
  const response = await apiGet<unknown>("/api/settings/family", signal);
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("設定データの形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function updateFamilySettings(input: {
  day_type?: "weekday" | "holiday" | "long_vacation";
  report_exclude_last_war?: boolean;
  display_note?: string | null;
}) {
  const response = await apiSend<unknown>("/api/settings/family", "PUT", input);
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("設定の保存結果の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function createCalendarConnectionPlaceholder(displayName: string) {
  const response = await apiSend<unknown>("/api/calendar-connections", "POST", {
    display_name: displayName,
  });
  return response;
}
