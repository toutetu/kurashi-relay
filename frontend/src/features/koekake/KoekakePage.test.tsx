/**
 * 本プロジェクトのフロントテストは MSW ではなく fetch モック方式
 * (OshigotoPersistence.test.tsx と同様。バックエンドが Pest→PHPUnit に合わせた判断と揃える)。
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";
import { resetKoekakeTaskMutationChainsForTests } from "./queries";

const fetchMock = vi.fn<typeof fetch>();
let uuidCounter = 0;

function nextUuid() {
  uuidCounter += 1;
  return `12345678-1234-4234-8234-123456789a${String(uuidCounter).padStart(2, "0")}`;
}

function taskSummary(
  overrides: Partial<{
    id: number;
    phase: string;
    name: string;
    prompt_count: number;
    latest_prompt_at: string | null;
    next_remind_at: string | null;
    suggested_prompt: {
      prompt_template_id: number;
      level: number;
      text: string;
    } | null;
    completion: {
      status: string;
      completed_at: string;
      note: string | null;
    } | null;
  }> = {},
) {
  return {
    id: 12,
    activity_key: "ACT-005",
    phase: "morning",
    name: "歯磨き",
    icon: "🪥",
    status: "scheduled",
    scheduled_at: "2026-07-18T07:40:00+09:00",
    prompt_count: 0,
    latest_prompt_at: null,
    next_remind_at: null,
    suggested_prompt: {
      prompt_template_id: 45,
      level: 1,
      text: "歯磨きしよう",
    },
    completion: null,
    ...overrides,
  };
}

function tasksListResponse(tasks: ReturnType<typeof taskSummary>[]) {
  return { date: "2026-07-18", tasks };
}

function taskDetailResponse(task: ReturnType<typeof taskSummary>) {
  return {
    ...task,
    prompts: [],
    prompt_candidates: [
      {
        level: 1,
        items: [
          {
            prompt_template_id: 45,
            text: "歯磨きしよう",
            is_preferred: false,
          },
        ],
      },
    ],
    reminders: [],
  };
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function matchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("声かけリマインダー", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    resetKoekakeTaskMutationChainsForTests();
    localStorage.clear();
    fetchMock.mockReset();
    uuidCounter = 0;
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => nextUuid() });
    vi.setSystemTime(new Date("2026-07-18T08:00:00+09:00"));
  });

  it("一覧: GET /api/koekake/tasks の応答からカードを描画する", async () => {
    fetchMock.mockImplementation((input) => {
      const url = matchUrl(input);
      if (url.includes("/api/koekake/tasks?")) {
        return jsonResponse(
          tasksListResponse([
            taskSummary({ prompt_count: 2, latest_prompt_at: "2026-07-18T08:12:00+09:00" }),
          ]),
        );
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");

    expect(await screen.findByText("歯磨き")).toBeInTheDocument();
    expect(screen.getByText("声かけ 2回")).toBeInTheDocument();
    expect(screen.getByText("歯磨きしよう")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/koekake/tasks?date=2026-07-18&phase=morning"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("声かけ済み: POST body とサーバ応答値で表示を更新する", async () => {
    let listCount = 0;
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        listCount += 1;
        return jsonResponse(
          tasksListResponse([
            taskSummary({
              prompt_count: listCount > 1 ? 5 : 0,
              suggested_prompt:
                listCount > 1
                  ? { prompt_template_id: 46, level: 2, text: "もう一度声かけ" }
                  : {
                      prompt_template_id: 45,
                      level: 1,
                      text: "歯磨きしよう",
                    },
            }),
          ]),
        );
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 5,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "サーバ推奨文",
          },
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");

    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );

    await waitFor(() => {
      expect(screen.getByText("声かけ 5回")).toBeInTheDocument();
      expect(screen.getByText("サーバ推奨文")).toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        matchUrl(url).endsWith("/api/koekake/prompt-events") &&
        init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(String(postCall?.[1]?.body));
    expect(body).toMatchObject({
      daily_task_id: 12,
      prompt_text: "歯磨きしよう",
      source: "template",
      idempotency_key: expect.any(String),
    });
  });

  it("連打: 同一タスクへの POST は直列化され idempotency_key は毎回異なる", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let promptCount = 0;
    const postBodies: Array<{ idempotency_key: string }> = [];

    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(
          tasksListResponse([taskSummary({ prompt_count: promptCount })]),
        );
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const body = JSON.parse(String(init?.body));
        postBodies.push(body);
        return new Promise<Response>((resolve) => {
          window.setTimeout(() => {
            promptCount += 1;
            inFlight -= 1;
            resolve(
              new Response(
                JSON.stringify({
                  prompt_event_id: 300 + promptCount,
                  daily_task_id: 12,
                  prompt_count: promptCount,
                  latest_prompt_at: "2026-07-18T08:20:00+09:00",
                  suggested_prompt: {
                    prompt_template_id: 45,
                    level: 1,
                    text: "歯磨きしよう",
                  },
                }),
                {
                  status: 201,
                  headers: { "Content-Type": "application/json" },
                },
              ),
            );
          }, 30);
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    const button = screen.getByRole("button", { name: "歯磨きに声かけ済み" });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(
      () => {
        expect(postBodies).toHaveLength(3);
      },
      { timeout: 3000 },
    );

    expect(maxInFlight).toBe(1);
    expect(new Set(postBodies.map((body) => body.idempotency_key)).size).toBe(3);
  });

  it("Undo: DELETE 後に回数と推奨文がサーバ再取得値へ戻る", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(
          tasksListResponse([
            taskSummary({
              prompt_count: 0,
              suggested_prompt: {
                prompt_template_id: 45,
                level: 1,
                text: "歯磨きしよう",
              },
            }),
          ]),
        );
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "2回目",
          },
        });
      }
      if (url.endsWith("/api/koekake/prompt-events/301") && method === "DELETE") {
        return jsonResponse({
          daily_task_id: 12,
          prompt_count: 0,
          latest_prompt_at: null,
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );
    await waitFor(() => {
      expect(screen.getByText("声かけ 1回")).toBeInTheDocument();
      expect(screen.getByText("2回目")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /とりけす/ }));

    await waitFor(() => {
      expect(screen.getByText("声かけ 0回")).toBeInTheDocument();
      expect(screen.getByText("歯磨きしよう")).toBeInTheDocument();
      expect(screen.queryByText("2回目")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/koekake/prompt-events/301"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("直列化: 同一タスクへの prompt と snooze は直列実行される", async () => {
    let snoozeCalled = false;
    let resolvePost: ((value: Response) => void) | undefined;

    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary()]));
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      if (url.endsWith("/api/koekake/tasks/12/snooze") && method === "POST") {
        snoozeCalled = true;
        return jsonResponse({
          task_id: 12,
          next_remind_at: "2026-07-18T08:35:00+09:00",
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");

    fireEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "歯磨きを5分後に再通知" }),
    );

    await waitFor(() => {
      expect(resolvePost).toBeDefined();
    });
    expect(snoozeCalled).toBe(false);

    resolvePost!(
      new Response(
        JSON.stringify({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 45,
            level: 1,
            text: "歯磨きしよう",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await waitFor(() => {
      expect(snoozeCalled).toBe(true);
    });
  });

  it("声かけ済み POST 失敗時にエラー表示が出る", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary({ prompt_count: 0 })]));
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return jsonResponse({ message: "声かけを保存できませんでした。" }, 500);
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "声かけを保存できませんでした。",
    );
    expect(screen.getByText("声かけ 0回")).toBeInTheDocument();
    expect(
      screen.queryByText(/の声かけを記録しました/),
    ).not.toBeInTheDocument();
  });

  it("Undo 失敗時はトーストが残りエラーが表示される", async () => {
    let serverPromptCount = 0;
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(
          tasksListResponse([taskSummary({ prompt_count: serverPromptCount })]),
        );
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        serverPromptCount = 1;
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "2回目",
          },
        });
      }
      if (url.endsWith("/api/koekake/prompt-events/301") && method === "DELETE") {
        return jsonResponse({ message: "取消に失敗しました。" }, 500);
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );
    await waitFor(() => {
      expect(screen.getByText("声かけ 1回")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /とりけす/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "取消に失敗しました。",
    );
    expect(screen.getByText(/歯磨きの声かけを記録しました/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    expect(screen.getByText("声かけ 1回")).toBeInTheDocument();
  });

  it("詳細: create 後に詳細クエリが再取得される", async () => {
    let detailFetchCount = 0;
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary()]));
      }
      if (url.endsWith("/api/koekake/tasks/12") && method === "GET") {
        detailFetchCount += 1;
        if (detailFetchCount === 1) {
          return jsonResponse(taskDetailResponse(taskSummary({ prompt_count: 0 })));
        }
        return jsonResponse({
          ...taskDetailResponse(taskSummary({ prompt_count: 1 })),
          prompts: [
            {
              id: 301,
              prompted_at: "2026-07-18T08:20:00+09:00",
              prompt_text: "歯磨きしよう",
              source: "template",
            },
          ],
        });
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 45,
            level: 1,
            text: "歯磨きしよう",
          },
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きの詳細" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("まだ声かけの記録はありません。"),
    ).toBeInTheDocument();

    const card = screen.getByRole("article");
    await userEvent.click(
      within(card).getByRole("button", { name: "歯磨きに声かけ済み" }),
    );

    await waitFor(() => {
      const updatedDialog = screen.getByRole("dialog");
      expect(
        within(updatedDialog).queryByText("まだ声かけの記録はありません。"),
      ).not.toBeInTheDocument();
      expect(within(updatedDialog).getByText(/1回目.*08:20/)).toBeInTheDocument();
    });
    expect(detailFetchCount).toBeGreaterThanOrEqual(2);
  });

  it("完了: PATCH completion でバッジが描画される", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary()]));
      }
      if (url.endsWith("/api/koekake/tasks/12") && method === "GET") {
        return jsonResponse(taskDetailResponse(taskSummary()));
      }
      if (url.endsWith("/api/koekake/tasks/12/completion") && method === "PATCH") {
        return jsonResponse({
          task_id: 12,
          status: "completed",
          completion: {
            status: "completed",
            completed_at: "2026-07-18T09:00:00+09:00",
            note: null,
          },
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きの詳細" }),
    );

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "完了" }));

    await waitFor(() => {
      const card = screen.getByRole("article");
      expect(within(card).getByText("完了")).toBeInTheDocument();
    });
  });

  it("snooze: minutes:5 の POST と next_remind_at の表示反映", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary()]));
      }
      if (url.endsWith("/api/koekake/tasks/12/snooze") && method === "POST") {
        return jsonResponse({
          task_id: 12,
          next_remind_at: "2026-07-18T08:35:00+09:00",
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きを5分後に再通知" }),
    );

    await waitFor(() => {
      expect(screen.getByText("08:35")).toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        matchUrl(url).endsWith("/api/koekake/tasks/12/snooze") &&
        init?.method === "POST",
    );
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ minutes: 5 });
  });

  it("タブ初期選択: 時刻モックで朝/夕方/夜が仕様どおり", async () => {
    const cases = [
      { time: "2026-07-18T08:00:00+09:00", phase: "morning", label: "朝" },
      { time: "2026-07-18T14:00:00+09:00", phase: "evening", label: "夕方" },
      { time: "2026-07-18T20:00:00+09:00", phase: "night", label: "夜" },
      { time: "2026-07-18T02:00:00+09:00", phase: "night", label: "夜" },
    ] as const;

    for (const testCase of cases) {
      fetchMock.mockReset();
      fetchMock.mockImplementation((input) => {
        const url = matchUrl(input);
        if (url.includes("/api/koekake/tasks?")) {
          return jsonResponse(tasksListResponse([taskSummary({ phase: testCase.phase })]));
        }
        return jsonResponse({}, 404);
      });

      vi.setSystemTime(new Date(testCase.time));
      const { unmount } = renderApp("/koekake");
      const tab = await screen.findByRole("tab", { name: testCase.label });
      expect(tab).toHaveAttribute("aria-selected", "true");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`phase=${testCase.phase}`),
        expect.any(Object),
      );
      unmount();
    }
  });

  it("直列化: 同一タスクへの cancel と completion は直列実行される", async () => {
    let completionCalled = false;
    let resolveDelete: ((value: Response) => void) | undefined;

    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary({ prompt_count: 1 })]));
      }
      if (url.endsWith("/api/koekake/tasks/12") && method === "GET") {
        return jsonResponse(taskDetailResponse(taskSummary({ prompt_count: 1 })));
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "2回目",
          },
        });
      }
      if (url.endsWith("/api/koekake/prompt-events/301") && method === "DELETE") {
        return new Promise<Response>((resolve) => {
          resolveDelete = resolve;
        });
      }
      if (url.endsWith("/api/koekake/tasks/12/completion") && method === "PATCH") {
        completionCalled = true;
        return jsonResponse({
          task_id: 12,
          status: "completed",
          completion: {
            status: "completed",
            completed_at: "2026-07-18T09:00:00+09:00",
            note: null,
          },
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );
    await waitFor(() => {
      expect(screen.getByText(/歯磨きの声かけを記録しました/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /とりけす/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きの詳細" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "完了" }));

    await waitFor(() => {
      expect(resolveDelete).toBeDefined();
    });
    expect(completionCalled).toBe(false);

    resolveDelete!(
      new Response(
        JSON.stringify({
          daily_task_id: 12,
          prompt_count: 0,
          latest_prompt_at: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await waitFor(() => {
      expect(completionCalled).toBe(true);
    });
  });

  it("詳細: cancel / completion / snooze 後に詳細クエリが再取得される", async () => {
    let detailFetchCount = 0;
    let listPromptCount = 0;

    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(
          tasksListResponse([
            taskSummary({
              prompt_count: listPromptCount,
              next_remind_at:
                listPromptCount === 0 ? null : "2026-07-18T08:35:00+09:00",
            }),
          ]),
        );
      }
      if (url.endsWith("/api/koekake/tasks/12") && method === "GET") {
        detailFetchCount += 1;
        return jsonResponse(
          taskDetailResponse(
            taskSummary({
              prompt_count: listPromptCount,
              next_remind_at:
                listPromptCount === 0 ? null : "2026-07-18T08:35:00+09:00",
            }),
          ),
        );
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        listPromptCount = 1;
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "2回目",
          },
        });
      }
      if (url.endsWith("/api/koekake/prompt-events/301") && method === "DELETE") {
        listPromptCount = 0;
        return jsonResponse({
          daily_task_id: 12,
          prompt_count: 0,
          latest_prompt_at: null,
        });
      }
      if (url.endsWith("/api/koekake/tasks/12/snooze") && method === "POST") {
        return jsonResponse({
          task_id: 12,
          next_remind_at: "2026-07-18T08:35:00+09:00",
        });
      }
      if (url.endsWith("/api/koekake/tasks/12/completion") && method === "PATCH") {
        return jsonResponse({
          task_id: 12,
          status: "completed",
          completion: {
            status: "completed",
            completed_at: "2026-07-18T09:00:00+09:00",
            note: null,
          },
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きの詳細" }),
    );
    await screen.findByRole("dialog");
    const initialDetailFetches = detailFetchCount;

    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );
    await waitFor(() => {
      expect(detailFetchCount).toBeGreaterThan(initialDetailFetches);
    });
    const afterCreateFetches = detailFetchCount;

    await userEvent.click(screen.getByRole("button", { name: /とりけす/ }));
    await waitFor(() => {
      expect(detailFetchCount).toBeGreaterThan(afterCreateFetches);
    });
    const afterCancelFetches = detailFetchCount;

    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きを5分後に再通知" }),
    );
    await waitFor(() => {
      expect(detailFetchCount).toBeGreaterThan(afterCancelFetches);
    });
    const afterSnoozeFetches = detailFetchCount;

    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "完了" }));
    await waitFor(() => {
      expect(detailFetchCount).toBeGreaterThan(afterSnoozeFetches);
    });
  });

  it("completion 失敗時にエラー表示が出る", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary()]));
      }
      if (url.endsWith("/api/koekake/tasks/12") && method === "GET") {
        return jsonResponse(taskDetailResponse(taskSummary()));
      }
      if (url.endsWith("/api/koekake/tasks/12/completion") && method === "PATCH") {
        return jsonResponse({ message: "完了の保存に失敗しました。" }, 500);
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きの詳細" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "完了" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "完了の保存に失敗しました。",
    );
  });

  it("snooze 失敗時にエラー表示が出る", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary()]));
      }
      if (url.endsWith("/api/koekake/tasks/12/snooze") && method === "POST") {
        return jsonResponse({ message: "再通知の保存に失敗しました。" }, 500);
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きを5分後に再通知" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "再通知の保存に失敗しました。",
    );
  });

  it("Undoタイマー競合: 取消通信中は10秒経過してもトーストが残り、失敗時に再試行できる", async () => {
    let resolveDelete: ((value: Response) => void) | undefined;

    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        return jsonResponse(tasksListResponse([taskSummary({ prompt_count: 0 })]));
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        return jsonResponse({
          prompt_event_id: 301,
          daily_task_id: 12,
          prompt_count: 1,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "2回目",
          },
        });
      }
      if (url.endsWith("/api/koekake/prompt-events/301") && method === "DELETE") {
        return new Promise<Response>((resolve) => {
          resolveDelete = resolve;
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");

    await userEvent.click(
      screen.getByRole("button", { name: "歯磨きに声かけ済み" }),
    );
    await waitFor(() => {
      expect(screen.getByText(/歯磨きの声かけを記録しました/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /とりけす/ }));
    expect(screen.getByText(/歯磨きの声かけを取り消し中/)).toBeInTheDocument();

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(screen.getByText(/歯磨きの声かけを取り消し中/)).toBeInTheDocument();
    vi.useRealTimers();

    resolveDelete!(
      new Response(JSON.stringify({ message: "取消に失敗しました。" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "取消に失敗しました。",
    );
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    expect(screen.getByText(/歯磨きの声かけを記録しました/)).toBeInTheDocument();
  });

  it("取消後の送信本文: 再取得完了前は声かけボタンが無効、再取得後は新しい level の本文で送る", async () => {
    let listPromptCount = 0;
    let resolveListRefetch: ((value: Response) => void) | undefined;
    let listRefetchPending = false;

    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/tasks?") && method === "GET") {
        if (listRefetchPending) {
          return new Promise<Response>((resolve) => {
            resolveListRefetch = resolve;
          });
        }
        return jsonResponse(
          tasksListResponse([
            taskSummary({
              prompt_count: listPromptCount,
              suggested_prompt:
                listPromptCount === 0
                  ? {
                      prompt_template_id: 45,
                      level: 1,
                      text: "歯磨きしよう",
                    }
                  : {
                      prompt_template_id: 46,
                      level: 2,
                      text: "2回目",
                    },
            }),
          ]),
        );
      }
      if (url.endsWith("/api/koekake/prompt-events") && method === "POST") {
        listPromptCount += 1;
        return jsonResponse({
          prompt_event_id: 300 + listPromptCount,
          daily_task_id: 12,
          prompt_count: listPromptCount,
          latest_prompt_at: "2026-07-18T08:20:00+09:00",
          suggested_prompt: {
            prompt_template_id: 46,
            level: 2,
            text: "2回目",
          },
        });
      }
      if (url.endsWith("/api/koekake/prompt-events/301") && method === "DELETE") {
        listPromptCount = 0;
        listRefetchPending = true;
        return jsonResponse({
          daily_task_id: 12,
          prompt_count: 0,
          latest_prompt_at: null,
        });
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    const promptButton = screen.getByRole("button", {
      name: "歯磨きに声かけ済み",
    });

    await userEvent.click(promptButton);
    await waitFor(() => {
      expect(screen.getByText("2回目")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /とりけす/ }));
    await waitFor(() => {
      expect(promptButton).toBeDisabled();
    });

    await userEvent.click(promptButton);
    const postCallsBeforeRefetch = fetchMock.mock.calls.filter(
      ([url, init]) =>
        matchUrl(url).endsWith("/api/koekake/prompt-events") &&
        init?.method === "POST",
    );
    expect(postCallsBeforeRefetch).toHaveLength(1);

    resolveListRefetch!(
      new Response(
        JSON.stringify(
          tasksListResponse([
            taskSummary({
              prompt_count: 0,
              suggested_prompt: {
                prompt_template_id: 45,
                level: 1,
                text: "歯磨きしよう",
              },
            }),
          ]),
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    listRefetchPending = false;

    await waitFor(() => {
      expect(promptButton).not.toBeDisabled();
      expect(screen.getByText("歯磨きしよう")).toBeInTheDocument();
    });

    await userEvent.click(promptButton);
    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        ([url, init]) =>
          matchUrl(url).endsWith("/api/koekake/prompt-events") &&
          init?.method === "POST",
      );
      expect(postCalls).toHaveLength(2);
      const body = JSON.parse(String(postCalls[1]?.[1]?.body));
      expect(body.prompt_text).toBe("歯磨きしよう");
    });
  });
});
