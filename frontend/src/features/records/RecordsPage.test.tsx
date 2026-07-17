import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";
import * as dateUtils from "../../utils/date";

const fetchMock = vi.fn<typeof fetch>();
const TODAY = "2026-07-17";

function summary(member: "child" | "mother", doneCount: number) {
  return {
    member,
    date: TODAY,
    today_done_count: doneCount,
    lifetime_count: doneCount,
    gauge_count: doneCount,
    gauge_size: 10,
    full_count: 0,
    coins: member === "child" ? 0 : null,
    points: member === "mother" ? 0 : null,
    collections_count: 0,
  };
}

function task(
  slug: string,
  title: string,
  count: number,
  sortOrder: number,
) {
  return {
    slug,
    title,
    category: null,
    point_value: 0,
    sort_order: sortOrder,
    count,
    last_record_id: count > 0 ? sortOrder : null,
    done: count > 0,
    record_id: count > 0 ? sortOrder : null,
  };
}

function tasksResponse(
  member: "child" | "mother",
  date: string,
  tasks: ReturnType<typeof task>[],
) {
  const doneCount = tasks.reduce((total, item) => total + item.count, 0);
  return {
    status: "success",
    data: {
      date,
      member,
      tasks,
      summary: { ...summary(member, doneCount), date },
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

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function mockTasksApi(
  handler: (member: string, date: string | null) => unknown,
) {
  fetchMock.mockImplementation((input) => {
    const url = getFetchUrl(input);
    if (!url.includes("/api/tasks?")) {
      return jsonResponse({ status: "error" }, 404);
    }
    const params = new URL(url, "http://localhost").searchParams;
    const member = params.get("member") ?? "";
    const date = params.get("date");
    return jsonResponse(handler(member, date));
  });
}

describe("記録を見る画面", () => {
  beforeEach(() => {
    vi.spyOn(dateUtils, "getTokyoToday").mockReturnValue(TODAY);
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("日付ナビで API の date クエリが変わる", async () => {
    const requestedDates: string[] = [];
    mockTasksApi((member, date) => {
      if (date) requestedDates.push(`${member}:${date}`);
      return tasksResponse(member as "child" | "mother", date ?? TODAY, [
        task("greeting", "あいさつする", 1, 1),
      ]);
    });

    const user = userEvent.setup();
    renderApp("/records");

    await screen.findByText("あいさつする");
    expect(requestedDates).toContain("child:2026-07-17");
    expect(requestedDates).toContain("mother:2026-07-17");

    await user.click(screen.getByRole("button", { name: /前の日/ }));

    await waitFor(() => {
      expect(requestedDates).toContain("child:2026-07-16");
      expect(requestedDates).toContain("mother:2026-07-16");
    });
  });

  it("0回の行を薄く表示する", async () => {
    mockTasksApi((member, date) =>
      tasksResponse(member as "child" | "mother", date ?? TODAY, [
        task("greeting", "あいさつする", 3, 1),
        task("thanks", "ありがとうをいう", 0, 2),
      ]),
    );

    renderApp("/records");

    const childSection = await screen.findByRole("region", {
      name: "むすめ の きろく",
    });
    const zeroRow = await within(childSection).findByText("ありがとうをいう");
    expect(zeroRow.closest("div")).toHaveClass("text-[var(--muted-text)]");
    expect(within(childSection).getByLabelText("0回")).toBeInTheDocument();
    expect(within(childSection).getByLabelText("3回")).toBeInTheDocument();
  });

  it("未来日には進めない", async () => {
    mockTasksApi((member, date) =>
      tasksResponse(member as "child" | "mother", date ?? TODAY, [
        task("greeting", "あいさつする", 1, 1),
      ]),
    );

    renderApp("/records");

    await screen.findByText("あいさつする");
    const nextButton = screen.getByRole("button", { name: /次の日/ });
    expect(nextButton).toBeDisabled();
  });

  it("エラー時に再試行できる", async () => {
    let childCalls = 0;
    fetchMock.mockImplementation((input) => {
      const url = getFetchUrl(input);
      if (!url.includes("/api/tasks?")) {
        return jsonResponse({ status: "error" }, 404);
      }
      const params = new URL(url, "http://localhost").searchParams;
      const member = params.get("member");
      const date = params.get("date") ?? TODAY;

      if (member === "child") {
        childCalls += 1;
        if (childCalls === 1) {
          return jsonResponse({ message: "server error" }, 500);
        }
      }

      return jsonResponse(
        tasksResponse(member as "child" | "mother", date, [
          task("greeting", "あいさつする", 1, 1),
        ]),
      );
    });

    const user = userEvent.setup();
    renderApp("/records");

    const childSection = await screen.findByRole("region", {
      name: "むすめ の きろく",
    });
    await waitFor(() => {
      expect(
        within(childSection).getByText(
          "きろくをよみこめませんでした。もういちどためしてね",
        ),
      ).toBeInTheDocument();
    });

    await user.click(
      within(childSection).getByRole("button", { name: "もう一度試す" }),
    );

    await waitFor(() => {
      expect(within(childSection).getByText("あいさつする")).toBeInTheDocument();
    });
    expect(childCalls).toBeGreaterThan(1);
  });
});
