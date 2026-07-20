import { z } from "zod";
import { ApiError, apiGet, apiSend } from "./client";

const connectionSchema = z.object({
  id: z.number(),
  provider: z.string(),
  display_name: z.string(),
  subject_role: z.enum(["mother", "child"]).optional().default("mother"),
  external_calendar_id: z.string().nullable().optional(),
  provider_account_id: z.string().nullable().optional(),
  timezone: z.string(),
  is_active: z.boolean(),
  last_synced_at: z.string().nullable(),
  connected: z.boolean().optional(),
  oauth_configured: z.boolean().optional(),
  oauth_ready: z.boolean(),
});

const listSchema = z.object({
  status: z.literal("success"),
  data: z.array(connectionSchema),
  meta: z
    .object({
      oauth_configured: z.boolean().optional(),
    })
    .optional(),
});

const syncSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    imported: z.number(),
    updated: z.number(),
    cancelled: z.number(),
    mode: z.enum(["google_api"]),
    message: z.string(),
  }),
});

const oauthStartSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    oauth_url: z.string().min(1),
  }),
});

const googleCalendarSchema = z.object({
  id: z.string(),
  summary: z.string(),
  primary: z.boolean(),
  access_role: z.string().nullable().optional(),
});

const calendarsSchema = z.object({
  status: z.literal("success"),
  data: z.array(googleCalendarSchema),
});

export type CalendarConnection = z.infer<typeof connectionSchema>;
export type CalendarSyncResult = z.infer<typeof syncSchema>["data"];
export type GoogleCalendarOption = z.infer<typeof googleCalendarSchema>;

export async function getCalendarConnections(signal?: AbortSignal) {
  const response = await apiGet<unknown>("/api/calendar-connections", signal);
  const parsed = listSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("カレンダー接続の形式が正しくありません。", 200);
  }
  return {
    connections: parsed.data.data,
    oauthConfigured:
      parsed.data.meta?.oauth_configured === true ||
      parsed.data.data.some((item) => item.oauth_configured === true),
  };
}

export async function createCalendarConnection(input: {
  display_name: string;
  external_calendar_id?: string;
  subject_role?: "mother" | "child";
}) {
  const response = await apiSend<unknown>("/api/calendar-connections", "POST", input);
  const parsed = z
    .object({ status: z.literal("success"), data: connectionSchema })
    .safeParse(response);
  if (!parsed.success) {
    const alt = z.object({ data: connectionSchema }).safeParse(response);
    if (alt.success) return alt.data.data;
    throw new ApiError("カレンダー接続の保存結果が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function startGoogleCalendarOAuth(options?: {
  connectionId?: number;
  subjectRole?: "mother" | "child";
}) {
  const params = new URLSearchParams();
  if (options?.connectionId !== undefined) {
    params.set("connection_id", String(options.connectionId));
  }
  if (options?.subjectRole) {
    params.set("subject_role", options.subjectRole);
  }
  const search = params.toString() ? `?${params.toString()}` : "";
  const response = await apiGet<unknown>(
    `/api/calendar-connections/oauth/start${search}`,
  );
  const parsed = oauthStartSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("Google接続URLの形式が正しくありません。", 200);
  }
  return parsed.data.data.oauth_url;
}

export async function listGoogleCalendars(connectionId: number, signal?: AbortSignal) {
  const response = await apiGet<unknown>(
    `/api/calendar-connections/${connectionId}/calendars`,
    signal,
  );
  const parsed = calendarsSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("カレンダー一覧の形式が正しくありません。", 200);
  }
  return parsed.data.data;
}

export async function selectGoogleCalendar(
  connectionId: number,
  input: { external_calendar_id: string; display_name?: string },
) {
  const response = await apiSend<unknown>(
    `/api/calendar-connections/${connectionId}/calendar`,
    "PATCH",
    input,
  );
  const parsed = z
    .object({ status: z.literal("success"), data: connectionSchema })
    .safeParse(response);
  if (!parsed.success) {
    const alt = z.object({ data: connectionSchema }).safeParse(response);
    if (alt.success) return alt.data.data;
    throw new ApiError("カレンダー選択の結果形式が正しくありません。", 200);
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

export async function disconnectCalendarConnection(id: number) {
  await apiSend<unknown>(`/api/calendar-connections/${id}`, "DELETE");
}
