import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const connectionSchema = z.object({
  id: z.number(),
  provider: z.string(),
  display_name: z.string(),
  external_calendar_id: z.string().nullable().optional(),
  timezone: z.string(),
  is_active: z.boolean(),
  last_synced_at: z.string().nullable(),
  oauth_ready: z.boolean(),
});

const listSchema = z.object({
  status: z.literal("success"),
  data: z.array(connectionSchema),
});

const syncSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    imported: z.number(),
    updated: z.number(),
    cancelled: z.number(),
    mode: z.enum(["google_api", "local_sample"]),
    message: z.string(),
  }),
});

export type CalendarConnection = z.infer<typeof connectionSchema>;
export type CalendarSyncResult = z.infer<typeof syncSchema>["data"];

export async function getCalendarConnections(signal?: AbortSignal) {
  const response = await apiGet<unknown>("/api/calendar-connections", signal);
  const parsed = listSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("カレンダー接続の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function createCalendarConnection(input: {
  display_name: string;
  external_calendar_id?: string;
}) {
  const response = await apiSend<unknown>("/api/calendar-connections", "POST", input);
  const parsed = z
    .object({ status: z.literal("success"), data: connectionSchema })
    .safeParse(response);
  if (!parsed.success) {
    // Resource may wrap without status on nested parse in some Laravel builds
    const alt = z.object({ data: connectionSchema }).safeParse(response);
    if (alt.success) return alt.data.data;
    throw new ApiError("カレンダー接続の保存結果が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function syncCalendarConnection(id: number, date?: string) {
  const search = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await apiSend<unknown>(
    `/api/calendar-connections/${id}/sync${search}`,
    "POST",
  );
  const parsed = syncSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("カレンダー同期の結果形式が正しくありません。", 200);
  }
  return parsed.data.data;
}
