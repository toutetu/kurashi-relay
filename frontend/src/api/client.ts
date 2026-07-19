import type { ApiErrorPayload } from "../types/dashboard";
import { isInertiaSessionAuth, getInertiaPathPrefix } from "./inertiaAuth";
import {
  captureFamilyTokenAuth,
  createFamilyTokenHeaders,
  requireFamilyToken,
} from "./familyToken";

const defaultApiBaseUrl =
  typeof window === "undefined"
    ? "http://localhost:8000"
    : `${window.location.protocol}//${window.location.hostname}:8000`;

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

function resolveApiUrl(path: string): string {
  if (isInertiaSessionAuth()) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

function resolveFetchInit(init: RequestInit = {}): RequestInit {
  if (!isInertiaSessionAuth()) {
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
    if (isInertiaSessionAuth()) {
      window.location.assign(`${getInertiaPathPrefix()}/family-token`);
    } else {
      requireFamilyToken(authSnapshot);
    }
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
    if (isInertiaSessionAuth()) {
      window.location.assign(`${getInertiaPathPrefix()}/family-token`);
    } else {
      requireFamilyToken(authSnapshot);
    }
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
