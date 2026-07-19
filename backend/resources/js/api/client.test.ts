import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiSend } from "./client";
import {
  getInertiaPathPrefix,
  setInertiaPathPrefix,
  setInertiaSessionAuth,
} from "./inertiaAuth";
import {
  getFamilyToken,
  resetFamilyTokenStateForTests,
  saveFamilyToken,
  subscribeFamilyTokenRequired,
} from "./familyToken";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("API client family token", () => {
  beforeEach(() => {
    resetFamilyTokenStateForTests();
    setInertiaSessionAuth(false);
    setInertiaPathPrefix("/app");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("保存済みのあいことばを全APIリクエストへ付与する", async () => {
    saveFamilyToken("family-secret");
    fetchMock.mockImplementation(() => jsonResponse({ status: "success" }));

    await apiGet("/api/dashboard");
    await apiSend("/api/musume/plan/1/items", "PUT", { category: "carry" });

    for (const [, request] of fetchMock.mock.calls) {
      expect(new Headers(request?.headers).get("X-Family-Token")).toBe(
        "family-secret",
      );
    }
  });

  it("未保存のときはX-Family-Tokenヘッダーを付けない", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ status: "success" }));

    await apiGet("/api/dashboard");

    const request = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).has("X-Family-Token")).toBe(false);
  });

  it("401で保存値を破棄し、再入力要求を通知する", async () => {
    saveFamilyToken("old-secret");
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);
    fetchMock.mockImplementation(() =>
      jsonResponse(
        { status: "error", message: "あいことばを確認してください。" },
        401,
      ),
    );

    await expect(apiGet("/api/dashboard")).rejects.toMatchObject({
      status: 401,
    });

    expect(getFamilyToken()).toBeNull();
    expect(onRequired).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("並行401でも再認証要求は一度だけ通知する", async () => {
    saveFamilyToken("old-secret");
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);
    fetchMock.mockImplementation(() =>
      jsonResponse(
        { status: "error", message: "あいことばを確認してください。" },
        401,
      ),
    );

    await Promise.allSettled([
      apiGet("/api/dashboard"),
      apiGet("/api/tasks"),
    ]);

    expect(onRequired).toHaveBeenCalledOnce();
    expect(getFamilyToken()).toBeNull();
    unsubscribe();
  });

  it("保存後に届いたstale 401は新しいトークンを破棄しない", async () => {
    saveFamilyToken("old-secret");
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);
    let releaseFirst401: (() => void) | undefined;
    const first401Gate = new Promise<void>((resolve) => {
      releaseFirst401 = resolve;
    });
    fetchMock.mockImplementation((_url) => {
      const path = typeof _url === "string" ? _url : _url.toString();
      if (path.endsWith("/api/dashboard")) {
        return first401Gate.then(() =>
          jsonResponse(
            { status: "error", message: "あいことばを確認してください。" },
            401,
          ),
        );
      }
      if (path.endsWith("/api/tasks")) {
        return jsonResponse({ status: "success", data: [] });
      }
      throw new Error(`unexpected path: ${path}`);
    });

    const stale401 = apiGet("/api/dashboard");
    await apiGet("/api/tasks");
    saveFamilyToken("new-secret");
    releaseFirst401?.();
    await expect(stale401).rejects.toMatchObject({ status: 401 });

    expect(getFamilyToken()).toBe("new-secret");
    expect(onRequired).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("同じ値を再保存した後に届いた遅延401は新しいトークンを破棄しない", async () => {
    saveFamilyToken("same-secret");
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);
    let releaseDelayed401: (() => void) | undefined;
    const delayed401Gate = new Promise<void>((resolve) => {
      releaseDelayed401 = resolve;
    });
    fetchMock.mockImplementation((_url) => {
      const path = typeof _url === "string" ? _url : _url.toString();
      if (path.endsWith("/api/dashboard")) {
        return delayed401Gate.then(() =>
          jsonResponse(
            { status: "error", message: "あいことばを確認してください。" },
            401,
          ),
        );
      }
      if (path.endsWith("/api/tasks")) {
        return jsonResponse(
          { status: "error", message: "あいことばを確認してください。" },
          401,
        );
      }
      throw new Error(`unexpected path: ${path}`);
    });

    const delayed401 = apiGet("/api/dashboard");
    await expect(apiGet("/api/tasks")).rejects.toMatchObject({ status: 401 });
    expect(getFamilyToken()).toBeNull();
    expect(onRequired).toHaveBeenCalledOnce();

    saveFamilyToken("same-secret");
    releaseDelayed401?.();
    await expect(delayed401).rejects.toMatchObject({ status: 401 });

    expect(getFamilyToken()).toBe("same-secret");
    expect(onRequired).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("POST/PATCH/DELETEにもX-Family-Tokenを付与する", async () => {
    saveFamilyToken("family-secret");
    fetchMock.mockImplementation(() => jsonResponse({ status: "success" }));

    await apiSend("/api/tasks", "POST", { title: "test" });
    await apiSend("/api/tasks/1", "PATCH", { title: "updated" });
    await apiSend("/api/tasks/1", "DELETE");

    const methods = fetchMock.mock.calls.map(([, request]) => request?.method);
    expect(methods).toEqual(["POST", "PATCH", "DELETE"]);

    for (const [, request] of fetchMock.mock.calls) {
      expect(new Headers(request?.headers).get("X-Family-Token")).toBe(
        "family-secret",
      );
    }
  });
});

describe("API client inertia session mode", () => {
  beforeEach(() => {
    resetFamilyTokenStateForTests();
    setInertiaSessionAuth(true);
    setInertiaPathPrefix("/app");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign: vi.fn() });
  });

  it("same-originでcredentialsを付け、相対/apiパスへ送る", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: "success" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await apiGet("/api/dashboard");

    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/dashboard");
    expect(request?.credentials).toBe("same-origin");
    expect(new Headers(request?.headers).has("X-Family-Token")).toBe(false);
  });

  it("401ではfamily-tokenページへ遷移し、SPA向け再入力通知は出さない", async () => {
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: "error",
            message: "あいことばを確認してください。",
          }),
          { status: 401 },
        ),
      ),
    );

    await expect(apiGet("/api/dashboard")).rejects.toMatchObject({ status: 401 });

    expect(assign).toHaveBeenCalledWith(`${getInertiaPathPrefix()}/family-token`);
    expect(onRequired).not.toHaveBeenCalled();
    unsubscribe();
  });
});
