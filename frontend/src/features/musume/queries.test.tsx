import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  musumeSummaryQueryKey,
  resetMusumePlanMutationChainForTests,
  useMusumeSummaryQuery,
  useReplaceMusumeItems,
} from "./queries";

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

function planResponse(overrides: Record<string, unknown> = {}) {
  return {
    plan: {
      id: 1,
      plan_date: "2026-07-18",
      mode: "summer",
      school_start_period: null,
      wake_up_time: null,
      today_state: "decided",
      tomorrow_items_state: "undecided",
      start_state: "undecided",
      review: { mode: "summer", completed_at: null },
      items: {
        today_task: [{ id: 1, title: "遊ぶ", sort_order: 0 }],
        tomorrow_item: [],
        memo: [],
      },
      ...overrides,
    },
  };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("musume queries", () => {
  beforeEach(() => {
    resetMusumePlanMutationChainForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("PUT items 成功後に musume-summary が再取得される", async () => {
    let summaryFetchCount = 0;
    fetchMock.mockImplementation((input, init) => {
      const url = matchUrl(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/koekake/musume-summary?") && method === "GET") {
        summaryFetchCount += 1;
        if (summaryFetchCount === 1) {
          return jsonResponse({ summary: null });
        }
        return jsonResponse({
          summary: {
            mode: "summer",
            today_tasks: ["遊ぶ"],
            tomorrow_items: [],
            wake_up_time: null,
            school_start_period: null,
            today_state: "decided",
            tomorrow_items_state: "undecided",
            start_state: "undecided",
            review_completed_at: null,
          },
        });
      }
      if (url.endsWith("/api/musume/plan/1/items") && method === "PUT") {
        return jsonResponse(planResponse());
      }
      return jsonResponse({}, 404);
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    const wrapper = createWrapper(queryClient);

    const { result: summaryResult } = renderHook(
      () => useMusumeSummaryQuery("2026-07-18"),
      { wrapper },
    );
    await waitFor(() => {
      expect(summaryResult.current.isSuccess).toBe(true);
    });
    expect(summaryFetchCount).toBe(1);
    expect(summaryResult.current.data?.summary).toBeNull();

    const { result: mutationResult } = renderHook(
      () => useReplaceMusumeItems("2026-07-18"),
      { wrapper },
    );
    await mutationResult.current.mutateAsync({
      planId: 1,
      body: { category: "today_task", titles: ["遊ぶ"] },
    });

    await waitFor(() => {
      expect(summaryFetchCount).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => {
      const cached = queryClient.getQueryData(
        musumeSummaryQueryKey("2026-07-18"),
      ) as { summary: { today_tasks: string[] } | null } | undefined;
      expect(cached?.summary?.today_tasks).toEqual(["遊ぶ"]);
    });
  });
});
