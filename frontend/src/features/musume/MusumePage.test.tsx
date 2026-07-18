/**
 * fetch モック方式 (KoekakePage.test.tsx と同様)
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";
import { resetMusumePlanMutationChainForTests } from "./queries";

const fetchMock = vi.fn<typeof fetch>();

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

function basePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    plan_date: "2026-07-18",
    mode: "summer",
    school_start_period: null,
    wake_up_time: null,
    today_state: "undecided",
    tomorrow_items_state: "undecided",
    start_state: "undecided",
    review: { mode: "summer", completed_at: null },
    items: {
      today_task: [],
      tomorrow_item: [],
      memo: [],
    },
    ...overrides,
  };
}

function planResponse(overrides: Record<string, unknown> = {}) {
  return { plan: basePlan(overrides) };
}

function taskSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    activity_key: "ACT-005",
    phase: "anytime",
    name: "いつでもタスク",
    icon: "⭐",
    status: "scheduled",
    scheduled_at: null,
    prompt_count: 0,
    latest_prompt_at: null,
    next_remind_at: null,
    suggested_prompt: null,
    completion: null,
    ...overrides,
  };
}

describe("娘用ホーム /musume", () => {
  beforeEach(() => {
    resetMusumePlanMutationChainForTests();
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.setSystemTime(new Date("2026-07-18T08:00:00+09:00"));
  });

  it("plan取得と3カード表示", async () => {
    fetchMock.mockImplementation((input) => {
      const url = matchUrl(input);
      if (url.includes("/api/musume/plan?")) {
        return jsonResponse(planResponse());
      }
      return jsonResponse({}, 404);
    });

    renderApp("/musume");

    expect(await screen.findByText("おかえり、あきちゃん")).toBeInTheDocument();
    expect(screen.getByText("いまから何する?")).toBeInTheDocument();
    expect(screen.getByText("明日 何がいる?")).toBeInTheDocument();
    expect(screen.getByText("明日 何時に起きる?")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/musume/plan?date=2026-07-18"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("チップ保存: PUT items 後にサーバ応答でカード表示が確定する", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/musume/plan?") && method === "GET") {
        return jsonResponse(planResponse());
      }
      if (url.endsWith("/api/musume/plan/1/items") && method === "PUT") {
        const body = JSON.parse(String(init?.body));
        return jsonResponse(
          planResponse({
            today_state: "decided",
            items: {
              today_task: body.titles.map((title: string, index: number) => ({
                id: index + 1,
                title,
                sort_order: index,
              })),
              tomorrow_item: [],
              memo: [],
            },
          }),
        );
      }
      return jsonResponse({}, 404);
    });

    renderApp("/musume");
    await screen.findByText("いまから何する?");

    await userEvent.click(
      screen.getByRole("button", { name: /いまから何する/ }),
    );
    const dialog = await screen.findByRole("dialog", { name: "いまから何する?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "遊ぶ" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "これにする!" }));

    await waitFor(() => {
      expect(screen.getByText("遊ぶ")).toBeInTheDocument();
    });

    const putCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        matchUrl(url).endsWith("/api/musume/plan/1/items") &&
        init?.method === "PUT",
    );
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      category: "today_task",
      titles: ["遊ぶ"],
    });
  });

  it("ママと決める: PATCH state=with_mama", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/musume/plan?") && method === "GET") {
        return jsonResponse(planResponse());
      }
      if (url.endsWith("/api/musume/plan/1") && method === "PATCH") {
        return jsonResponse(planResponse({ today_state: "with_mama" }));
      }
      return jsonResponse({}, 404);
    });

    renderApp("/musume");
    await screen.findByText("いまから何する?");

    await userEvent.click(
      screen.getByRole("button", { name: /いまから何する/ }),
    );
    const dialog = await screen.findByRole("dialog", { name: "いまから何する?" });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "🎀 ママと決める" }),
    );

    await waitFor(() => {
      expect(screen.getByText("🎀 ママと決める")).toBeInTheDocument();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        matchUrl(url).endsWith("/api/musume/plan/1") && init?.method === "PATCH",
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      today_state: "with_mama",
    });
  });

  it("モード切替で3枚目カード・チップ・振り返り項目が切替", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/musume/plan?") && method === "GET") {
        return jsonResponse(planResponse());
      }
      if (url.endsWith("/api/musume/plan/1") && method === "PATCH") {
        return jsonResponse(planResponse({ mode: "school" }));
      }
      return jsonResponse({}, 404);
    });

    renderApp("/musume");
    await screen.findByText("明日 何時に起きる?");

    await userEvent.click(screen.getByRole("button", { name: "🏫 学校" }));

    await waitFor(() => {
      expect(screen.getByText("明日 何時間目から登校?")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /何時間目から登校/ }),
    );
    const whenDialog = await screen.findByRole("dialog", {
      name: "明日 何時間目から登校?",
    });
    expect(
      within(whenDialog).getByRole("button", { name: "1時間目から" }),
    ).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /今日の振り返り/ }));
    const reviewDialog = await screen.findByRole("dialog", {
      name: "今日の振り返り",
    });
    expect(
      within(reviewDialog).getByText("できたこと"),
    ).toBeInTheDocument();
  });

  it("振り返り保存失敗時は成功表示せず再試行できる", async () => {
    let postAttempts = 0;
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/musume/plan?") && method === "GET") {
        return jsonResponse(planResponse());
      }
      if (
        url.endsWith("/api/musume/plan/1/reflection/complete") &&
        method === "POST"
      ) {
        postAttempts += 1;
        return jsonResponse({ message: "保存に失敗しました。" }, 500);
      }
      return jsonResponse({}, 404);
    });

    renderApp("/musume");
    await screen.findByText("今日の振り返り");

    await userEvent.click(screen.getByRole("button", { name: /今日の振り返り/ }));
    const dialog = await screen.findByRole("dialog", { name: "今日の振り返り" });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "確認おわり!" }),
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText("うまく届かなかったみたい。もういちど押してね"),
      ).toBeInTheDocument();
    });
    expect(
      within(dialog).getByRole("button", { name: "確認おわり!" }),
    ).toBeEnabled();
    expect(screen.queryByText("できた 🎀")).not.toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "確認おわり!" }),
    );
    await waitFor(() => {
      expect(postAttempts).toBe(2);
    });

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /今日の振り返り/ }));
    const reopened = await screen.findByRole("dialog", { name: "今日の振り返り" });
    expect(
      within(reopened).getByRole("button", { name: "確認おわり!" }),
    ).toBeInTheDocument();
  });

  it("振り返りcomplete → バッジ表示", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/musume/plan?") && method === "GET") {
        return jsonResponse(planResponse());
      }
      if (
        url.endsWith("/api/musume/plan/1/reflection/complete") &&
        method === "POST"
      ) {
        return jsonResponse(
          planResponse({
            review: {
              mode: "summer",
              completed_at: "2026-07-18T20:00:00+09:00",
            },
          }),
        );
      }
      return jsonResponse({}, 404);
    });

    renderApp("/musume");
    await screen.findByText("今日の振り返り");

    await userEvent.click(screen.getByRole("button", { name: /今日の振り返り/ }));
    const dialog = await screen.findByRole("dialog", { name: "今日の振り返り" });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "確認おわり!" }),
    );

    await waitFor(() => {
      expect(screen.getByText("できた 🎀")).toBeInTheDocument();
    });
  });
});

describe("母側 KoekakePage むすめ拡張", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.setSystemTime(new Date("2026-07-18T08:00:00+09:00"));
  });

  function mockKoekakeList(phase: string, tasks: ReturnType<typeof taskSummary>[]) {
    if (phase === "anytime") {
      return { date: "2026-07-18", tasks };
    }
    return {
      date: "2026-07-18",
      tasks: [
        taskSummary({
          phase,
          name: "歯磨き",
          suggested_prompt: {
            prompt_template_id: 45,
            level: 1,
            text: "歯磨きしよう",
          },
        }),
      ],
    };
  }

  it("musume-summary表示", async () => {
    fetchMock.mockImplementation((input) => {
      const url = matchUrl(input);
      if (url.includes("/api/koekake/musume-summary?")) {
        return jsonResponse({
          summary: {
            mode: "summer",
            today_tasks: ["遊ぶ"],
            tomorrow_items: ["水筒"],
            wake_up_time: "07:30",
            school_start_period: null,
            today_state: "decided",
            tomorrow_items_state: "decided",
            start_state: "decided",
            review_completed_at: "2026-07-18T20:00:00+09:00",
          },
        });
      }
      if (url.includes("/api/koekake/tasks?")) {
        const phase = new URL(url, "http://localhost").searchParams.get("phase");
        return jsonResponse(mockKoekakeList(phase ?? "morning", []));
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");

    expect(await screen.findByText("むすめの見通し")).toBeInTheDocument();
    expect(await screen.findByText(/いまから何する\?: 遊ぶ/)).toBeInTheDocument();
    expect(screen.getByText(/明日 何がいる\?: 水筒/)).toBeInTheDocument();
    expect(screen.getByText(/明日 何時に起きる\?: 7:30/)).toBeInTheDocument();
    expect(screen.getByText("確認完了 🎀")).toBeInTheDocument();
  });

  it("summary:null 時の中立表示", async () => {
    fetchMock.mockImplementation((input) => {
      const url = matchUrl(input);
      if (url.includes("/api/koekake/musume-summary?")) {
        return jsonResponse({ summary: null });
      }
      if (url.includes("/api/koekake/tasks?")) {
        const phase = new URL(url, "http://localhost").searchParams.get("phase");
        return jsonResponse(mockKoekakeList(phase ?? "morning", []));
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");

    expect(await screen.findByText("むすめの見通し")).toBeInTheDocument();
    expect(await screen.findByText("まだ決めてないよ")).toBeInTheDocument();
  });

  it("anytimeタブ: 0件=非表示・1件以上=表示", async () => {
    fetchMock.mockImplementation((input) => {
      const url = matchUrl(input);
      if (url.includes("/api/koekake/musume-summary?")) {
        return jsonResponse({ summary: null });
      }
      if (url.includes("/api/koekake/tasks?")) {
        const phase = new URL(url, "http://localhost").searchParams.get("phase");
        if (phase === "anytime") {
          return jsonResponse(mockKoekakeList("anytime", [taskSummary()]));
        }
        return jsonResponse(mockKoekakeList(phase ?? "morning", []));
      }
      return jsonResponse({}, 404);
    });

    const { unmount } = renderApp("/koekake");
    expect(await screen.findByText("歯磨き")).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "いつでも" })).toBeInTheDocument();
    unmount();

    fetchMock.mockReset();
    fetchMock.mockImplementation((input) => {
      const url = matchUrl(input);
      if (url.includes("/api/koekake/musume-summary?")) {
        return jsonResponse({ summary: null });
      }
      if (url.includes("/api/koekake/tasks?")) {
        const phase = new URL(url, "http://localhost").searchParams.get("phase");
        return jsonResponse(mockKoekakeList(phase ?? "morning", []));
      }
      return jsonResponse({}, 404);
    });

    renderApp("/koekake");
    await screen.findByText("歯磨き");
    expect(screen.queryByRole("tab", { name: "いつでも" })).not.toBeInTheDocument();
  });
});
