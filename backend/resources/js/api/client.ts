import type { ApiErrorPayload } from "../types/dashboard";
import {
  captureFamilyTokenAuth,
  createFamilyTokenHeaders,
  requireFamilyToken,
} from "./familyToken";

function resolveDefaultApiBaseUrl(): string {
  if (typeof window !== "undefined" && typeof window.location?.origin === "string") {
    return window.location.origin;
  }

  // Non-browser contexts fall back to relative same-origin paths.
  return "";
}

function resolveConfiguredApiBaseUrl(): string {
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const rawBaseUrl =
    typeof envApiBaseUrl === "string" && envApiBaseUrl.length > 0
      ? envApiBaseUrl
      : resolveDefaultApiBaseUrl();

  return rawBaseUrl.replace(/\/+$/, "");
}

/** Current API base. Prefer resolveConfiguredApiBaseUrl() semantics at call time. */
export const API_BASE_URL = resolveConfiguredApiBaseUrl();

function normalizeApiPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function isSameOriginApiBase(): boolean {
  const apiBaseUrl = resolveConfiguredApiBaseUrl();

  if (apiBaseUrl === "") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return apiBaseUrl === window.location.origin;
}

function resolveApiUrl(path: string): string {
  const normalizedPath = normalizeApiPath(path);

  if (isSameOriginApiBase()) {
    return normalizedPath;
  }

  return `${resolveConfiguredApiBaseUrl()}${normalizedPath}`;
}

function resolveFetchInit(init: RequestInit = {}): RequestInit {
  if (!isSameOriginApiBase()) {
    // Keep Render rollback cross-origin behavior unchanged.
    return init;
  }

  return {
    ...init,
    credentials: "same-origin",
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const authSnapshot = captureFamilyTokenAuth();
  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), resolveFetchInit({
      method: "GET",
      headers: createFamilyTokenHeaders({ Accept: "application/json" }),
      signal,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      "APIに接続できませんでした。通信状態を確認してください。",
      0,
    );
  }
  const payload = await parseJson(response);
  if (response.status === 401) {
    requireFamilyToken(authSnapshot);
  }

  if (!response.ok) {
    const errorPayload = isErrorPayload(payload) ? payload : null;
    throw new ApiError(
      errorPayload?.message ?? "データの取得中に問題が発生しました。",
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

export async function apiSend<T>(
  path: string,
  method: "POST" | "DELETE" | "PATCH" | "PUT",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const authSnapshot = captureFamilyTokenAuth();
  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), resolveFetchInit({
      method,
      headers: createFamilyTokenHeaders({
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      }),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      "APIに接続できませんでした。通信状態を確認してください。",
      0,
    );
  }

  const payload = await parseJson(response);
  if (response.status === 401) {
    requireFamilyToken(authSnapshot);
  }
  if (!response.ok) {
    const errorPayload = isErrorPayload(payload) ? payload : null;
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
