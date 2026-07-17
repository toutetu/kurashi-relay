import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";

const fetchMock = vi.fn<typeof fetch>();
let uuidCounter = 0;

function nextUuid() {
  uuidCounter += 1;
  return `12345678-1234-4234-8234-123456789a${String(uuidCounter).padStart(2, "0")}`;
}

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

function task(count = 0, lastRecordId: number | null = null) {
  return {
    slug: "kigae",
    title: "自分で着替えた",
    category: null,
    point_value: 0,
    sort_order: 1,
    count,
    last_record_id: lastRecordId,
  };
}

function tasksResponse(
  gaugeCount = 0,
  count = 0,
  lastRecordId: number | null = null,
) {
  return {
    status: "success",
    data: {
      date: "2026-07-17",
      member: "child",
      tasks: [task(count, lastRecordId)],
      summary: summary(gaugeCount, count),
    },
    meta: { timezone: "Asia/Tokyo" },
  };
}

function createResponse(
  gaugeCount: number,
  recordId: number,
  taskCount: number,
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
        id: recordId,
        member: "child",
        task: "kigae",
        record_date: "2026-07-17",
        completed_at: "2026-07-17T10:00:00+09:00",
        cancelled_at: null,
      },
      summary: {
        ...summary(gaugeCount, taskCount),
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

function cancelResponse(gaugeCount: number, taskCount: number) {
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
      summary: summary(gaugeCount, taskCount),
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
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    uuidCounter = 0;
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => nextUuid() });
  });

  it("APIのタスクとゲージを初期値0から表示する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(tasksResponse(2)));
    renderApp("/oshigoto");

    expect(
      await screen.findByRole("button", {
        name: "自分で着替えたを記録。きょう0件",
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
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);

    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう1件" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/上弦の月 3 \/ 10個/)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      member: "child",
      task: "kigae",
      idempotency_key: "12345678-1234-4234-8234-123456789a01",
      source: "web",
    });

    await act(async () => {
      resolvePost?.(
        new Response(JSON.stringify(createResponse(3, 7, 1)), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    await waitFor(() =>
      expect(screen.queryByText("保存中…")).not.toBeInTheDocument(),
    );
  });

  it("3回タップでPOSTが3回走り、バッジが3になる", async () => {
    let postCount = 0;
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        postCount += 1;
        return jsonResponse(createResponse(2 + postCount, 6 + postCount, postCount), 201);
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    await user.click(row);
    await user.click(row);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "自分で着替えたを記録。きょう3件" }),
      ).toBeInTheDocument(),
    );

    const postBodies = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(postBodies).toHaveLength(3);
    expect(new Set(postBodies.map((body) => body.idempotency_key)).size).toBe(3);
  });

  it("連打してもカウントピルは常に1個だけ表示される", async () => {
    let postCount = 0;
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        postCount += 1;
        return jsonResponse(createResponse(2 + postCount, 6 + postCount, postCount), 201);
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    await user.click(row);
    await user.click(row);

    const updatedRow = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう3件",
    });
    expect(within(updatedRow).getAllByText(/^\d+件$/)).toHaveLength(1);
  });

  it("↩ とりけすで最後の1回分をDELETEし、サーバのsummaryを反映する", async () => {
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return jsonResponse(createResponse(3, 7, 1), 201);
      }
      if (init?.method === "DELETE") {
        return jsonResponse(cancelResponse(2, 0));
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);

    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/task-records/7"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/三日月 2 \/ 10個/)).toBeInTheDocument(),
    );
  });

  it("送信中のcreateを取り消すとPOST成功後にcancelが発行され0件に収束する", async () => {
    let resolvePost: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      if (init?.method === "DELETE") {
        return jsonResponse(cancelResponse(2, 0));
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう1件" }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );

    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(0);

    await act(async () => {
      resolvePost?.(
        new Response(JSON.stringify(createResponse(3, 7, 1)), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/task-records/7"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/三日月 2 \/ 10個/)).toBeInTheDocument(),
    );
  });

  it("↩ とりけすでdecrementは1回だけ", async () => {
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return jsonResponse(createResponse(3, 7, 1), 201);
      }
      if (init?.method === "DELETE") {
        return jsonResponse(cancelResponse(2, 0));
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);

    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
      ).toHaveLength(1),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取り消す" }),
    ).not.toBeInTheDocument();
  });

  it("未送信のpending createがある状態で取り消すとAPIを呼ばずキューから除去する", async () => {
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    expect(await screen.findByText("あとで保存します")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう1件" }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );

    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(0);

    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return jsonResponse(createResponse(3, 7, 1), 201);
      }
      return jsonResponse(tasksResponse(2));
    });
    window.dispatchEvent(new Event("online"));
    await waitFor(() =>
      expect(screen.queryByText("保存中…")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });

  it("サーバが返したitem_slugの報酬だけを一度表示する", async () => {
    fetchMock.mockImplementation((_input, init) =>
      init?.method === "POST"
        ? jsonResponse(
            createResponse(0, 7, 1, {
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
        name: "自分で着替えたを記録。きょう0件",
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
          : jsonResponse(createResponse(1, 7, 1), 201);
      }
      return jsonResponse(tasksResponse(0));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    await user.click(
      await screen.findByRole("button", {
        name: "自分で着替えたを記録。きょう0件",
      }),
    );
    expect(await screen.findByText("あとで保存します")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう1件" }),
    ).toBeInTheDocument();

    offline = false;
    window.dispatchEvent(new Event("online"));
    expect(await screen.findByText("保存できました")).toBeInTheDocument();

    const postBodies = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(postBodies).toHaveLength(2);
    expect(postBodies[0].idempotency_key).toBe(
      "12345678-1234-4234-8234-123456789a01",
    );
    expect(postBodies[1].idempotency_key).toBe(
      "12345678-1234-4234-8234-123456789a01",
    );
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
              count: 0,
              last_record_id: null,
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
      await screen.findByRole("button", { name: "食器を洗ったを記録。きょう0件" }),
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
      screen.queryByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).not.toBeInTheDocument();
  });

  it("+1でキラキラ画面に↩ とりけすが表示される", async () => {
    fetchMock.mockImplementation(() => jsonResponse(tasksResponse(2)));
    const user = userEvent.setup();
    renderApp("/oshigoto");

    await user.click(
      await screen.findByRole("button", {
        name: "自分で着替えたを記録。きょう0件",
      }),
    );

    expect(
      screen.getByRole("button", { name: "↩ とりけす" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取り消す" }),
    ).not.toBeInTheDocument();
  });

  it("↩ とりけすはキラキラ画面とともに2秒後に消える", async () => {
    fetchMock.mockImplementation(() => jsonResponse(tasksResponse(2)));
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });

    vi.useFakeTimers();
    fireEvent.click(row);
    expect(
      screen.getByRole("button", { name: "↩ とりけす" }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_150));
    expect(
      screen.queryByRole("button", { name: "↩ とりけす" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取り消す" }),
    ).not.toBeInTheDocument();
  });

  it("↩ とりけすでcountが1減る", async () => {
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return jsonResponse(createResponse(3, 7, 1), 201);
      }
      if (init?.method === "DELETE") {
        return jsonResponse(cancelResponse(2, 0));
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう1件" }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
  });

  it("確定エラー後は取り消し予約を破棄し、再記録したrecordを誤cancelしない", async () => {
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
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );

    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return jsonResponse(createResponse(3, 8, 1), 201);
      }
      if (init?.method === "DELETE") {
        return jsonResponse(cancelResponse(2, 0));
      }
      return jsonResponse(tasksResponse(2, 0));
    });

    await act(async () => {
      resolvePost?.(
        new Response(
          JSON.stringify({
            status: "error",
            message: "うまく保存できませんでした。もう一度試してね",
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
      ).toBeInTheDocument(),
    );

    await user.click(row);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "自分で着替えたを記録。きょう1件" }),
      ).toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(0);
  });

  it("in-flightのcreate2件を取り消すとそれぞれに補償DELETEが発行される", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        });
      }
      if (init?.method === "DELETE") {
        return jsonResponse(cancelResponse(2, 0));
      }
      return jsonResponse(tasksResponse(2));
    });
    const user = userEvent.setup();
    renderApp("/oshigoto");

    const row = await screen.findByRole("button", {
      name: "自分で着替えたを記録。きょう0件",
    });
    await user.click(row);
    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();

    await user.click(row);
    await user.click(
      await screen.findByRole("button", { name: "↩ とりけす" }),
    );
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();

    await act(async () => {
      resolvers[0]?.(
        new Response(JSON.stringify(createResponse(3, 7, 1)), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
      resolvers[1]?.(
        new Response(JSON.stringify(createResponse(3, 8, 1)), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
      ).toHaveLength(2),
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init?.method === "DELETE" &&
          String(url).includes("/api/task-records/7"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init?.method === "DELETE" &&
          String(url).includes("/api/task-records/8"),
      ),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "自分で着替えたを記録。きょう0件" }),
    ).toBeInTheDocument();
  });
});
