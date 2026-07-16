import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";

const fetchMock = vi.fn<typeof fetch>();
const UUID = "12345678-1234-4234-8234-123456789abc";

function summary(gaugeCount: number, doneCount = gaugeCount) {
  return {
    member: "child",
    date: "2026-07-17",
    today_done_count: doneCount,
    lifetime_count: gaugeCount,
    gauge_count: gaugeCount,
    gauge_size: 10,
    full_count: 0,
    coins: 0,
    points: null,
    collections_count: 0,
  };
}

function task(done = false, recordId: number | null = null) {
  return {
    slug: "kigae",
    title: "自分で着替えた",
    category: null,
    point_value: 0,
    sort_order: 1,
    done,
    record_id: recordId,
  };
}

function tasksResponse(
  gaugeCount = 0,
  done = false,
  recordId: number | null = null,
) {
  return {
    status: "success",
    data: {
      date: "2026-07-17",
      member: "child",
      tasks: [task(done, recordId)],
      summary: summary(gaugeCount, done ? 1 : 0),
    },
    meta: { timezone: "Asia/Tokyo" },
  };
}

function createResponse(
  gaugeCount: number,
  revealedReward: null | {
    type: "zombie";
    item_slug: string;
    milestone_number: number;
    obtained_on: string;
  } = null,
) {
  return {
    status: "success",
    data: {
      record: {
        id: 7,
        member: "child",
        task: "kigae",
        record_date: "2026-07-17",
        completed_at: "2026-07-17T10:00:00+09:00",
        cancelled_at: null,
      },
      summary: {
        ...summary(gaugeCount, 1),
        lifetime_count: revealedReward ? 10 : gaugeCount,
        full_count: revealedReward ? 1 : 0,
        coins: revealedReward ? 100 : 0,
        collections_count: revealedReward ? 1 : 0,
      },
      revealed_reward: revealedReward,
    },
    meta: { timezone: "Asia/Tokyo", deduplicated: false },
  };
}

function cancelResponse(gaugeCount: number) {
  return {
    status: "success",
    data: {
      record: {
        id: 7,
        member: "child",
        task: "kigae",
        record_date: "2026-07-17",
        completed_at: "2026-07-17T10:00:00+09:00",
        cancelled_at: "2026-07-17T10:01:00+09:00",
      },
      summary: summary(gaugeCount, 0),
    },
    meta: { timezone: "Asia/Tokyo" },
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

describe("くらしのおしごと永続化", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => UUID });
  });

  it("APIのタスクとゲージを初期値0から表示する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(tasksResponse(2)));
    renderApp("/oshigoto");

    expect(
      await screen.findByRole("button", {
        name: "自分で着替えた（まだ）",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/三日月 2 \/ 10個/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks?member=child"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("完了を即時反映し、固定した冪等キーでPOSTして確定値へ同期する", async () => {
    let resolvePost: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えた（まだ）",
    });
    await user.click(row);

    expect(
      screen.getByRole("button", { name: "自分で着替えた（できた）" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/上弦の月 3 \/ 10個/)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      member: "child",
      task: "kigae",
      idempotency_key: UUID,
      source: "web",
    });

    await act(async () => {
      resolvePost?.(
        new Response(JSON.stringify(createResponse(3)), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    await waitFor(() =>
      expect(screen.queryByText("保存中…")).not.toBeInTheDocument(),
    );
  });

  it("完了済みタスクの取消をDELETEし、サーバのsummaryを反映する", async () => {
    fetchMock.mockImplementation((_input, init) =>
      init?.method === "DELETE"
        ? jsonResponse(cancelResponse(2))
        : jsonResponse(tasksResponse(3, true, 7)),
    );
    const user = userEvent.setup();
    renderApp("/oshigoto");

    await user.click(
      await screen.findByRole("button", {
        name: "自分で着替えた（できた）",
      }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/task-records/7"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えた（まだ）" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/三日月 2 \/ 10個/)).toBeInTheDocument(),
    );
  });

  it("サーバが返したitem_slugの報酬だけを一度表示する", async () => {
    fetchMock.mockImplementation((_input, init) =>
      init?.method === "POST"
        ? jsonResponse(
            createResponse(0, {
              type: "zombie",
              item_slug: "vampire",
              milestone_number: 1,
              obtained_on: "2026-07-17",
            }),
            201,
          )
        : jsonResponse(tasksResponse(9)),
    );
    const user = userEvent.setup();
    renderApp("/oshigoto");

    await user.click(
      await screen.findByRole("button", {
        name: "自分で着替えた（まだ）",
      }),
    );
    expect(
      await screen.findByText("吸血鬼 登場！", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "つぎへ" }));
    expect(screen.queryByText("吸血鬼 登場！")).not.toBeInTheDocument();

    window.dispatchEvent(new Event("online"));
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(screen.queryByText("吸血鬼 登場！")).not.toBeInTheDocument();
  });

  it("通信断では操作と同じ冪等キーをキューに残し、onlineで再送する", async () => {
    let offline = true;
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return offline
          ? Promise.reject(new TypeError("Failed to fetch"))
          : jsonResponse(createResponse(1), 201);
      }
      return jsonResponse(tasksResponse(0));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    await user.click(
      await screen.findByRole("button", {
        name: "自分で着替えた（まだ）",
      }),
    );
    expect(await screen.findByText("あとで保存します")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "自分で着替えた（できた）" }),
    ).toBeInTheDocument();

    offline = false;
    window.dispatchEvent(new Event("online"));
    expect(await screen.findByText("保存できました")).toBeInTheDocument();

    const postBodies = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(postBodies).toHaveLength(2);
    expect(postBodies[0].idempotency_key).toBe(UUID);
    expect(postBodies[1].idempotency_key).toBe(UUID);
  });

  it("ママの家事手帖もAPI由来のポイントとタスクへ同期する", async () => {
    const motherSummary = {
      ...summary(0, 0),
      member: "mother",
      coins: null,
      points: 0,
    };
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return jsonResponse(
          {
            status: "success",
            data: {
              record: {
                id: 11,
                member: "mother",
                task: "shokki",
                record_date: "2026-07-17",
                completed_at: "2026-07-17T10:00:00+09:00",
                cancelled_at: null,
              },
              summary: {
                ...motherSummary,
                today_done_count: 1,
                lifetime_count: 1,
                gauge_count: 1,
                points: 10,
              },
              revealed_reward: null,
            },
            meta: { timezone: "Asia/Tokyo", deduplicated: false },
          },
          201,
        );
      }
      return jsonResponse({
        status: "success",
        data: {
          date: "2026-07-17",
          member: "mother",
          tasks: [
            {
              slug: "shokki",
              title: "食器を洗った",
              category: null,
              point_value: 10,
              sort_order: 1,
              done: false,
              record_id: null,
            },
          ],
          summary: motherSummary,
        },
        meta: { timezone: "Asia/Tokyo" },
      });
    });
    const user = userEvent.setup();
    renderApp("/mama-kaji");

    expect(await screen.findByText(/0pt ／ 作る券まで/)).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "食器を洗った（まだ）" }),
    );
    expect(await screen.findByText(/10pt ／ 作る券まで/)).toBeInTheDocument();

    const postBody = JSON.parse(
      String(
        fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]
          ?.body,
      ),
    );
    expect(postBody).toMatchObject({ member: "mother", task: "shokki" });
  });

  it("不正なAPIレスポンスでも画面をクラッシュさせない", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        ...tasksResponse(0),
        data: { ...tasksResponse(0).data, tasks: "invalid" },
      }),
    );
    renderApp("/oshigoto");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "おしごとのデータ形式が正しくありません。",
    );
    expect(
      screen.queryByRole("button", { name: "自分で着替えた（まだ）" }),
    ).not.toBeInTheDocument();
  });
});
