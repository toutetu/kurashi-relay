import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardResponse } from "./test/fixtures/dashboard";
import { renderApp } from "./test/renderApp";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("くらしリレー SPA", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("API取得中にローディングを表示する", () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderApp();

    expect(screen.getByRole("status")).toHaveTextContent(
      "今日のくらしを読み込んでいます",
    );
  });

  it("ホームには表示順どおり6項目だけを表示する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "現在の活動" }),
    ).toBeInTheDocument();
    for (const heading of [
      "クイック活動記録",
      "クイック記録",
      "現在の活動",
      "次の予定",
      "母の体調と気分",
      "時間の内訳",
    ]) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }
    expect(
      Array.from(document.querySelectorAll("main h2")).map(
        (heading) => heading.textContent,
      ),
    ).toEqual([
      "クイック活動記録",
      "クイック記録",
      "現在の活動",
      "次の予定",
      "母の体調と気分",
      "時間の内訳",
    ]);
    for (const absentHeading of [
      "娘の体調と気分",
      "娘の今日の作戦",
      "予定への影響",
      "対応事項",
      "ラストウォー",
    ]) {
      expect(
        screen.queryByRole("heading", { name: absentHeading }),
      ).not.toBeInTheDocument();
    }
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/dashboard?date="),
      expect.objectContaining({ method: "GET" }),
    );
    expect(screen.getByTestId("home-record-row")).toHaveClass(
      "xl:grid-cols-3",
      "xl:items-stretch",
    );
    expect(screen.getByTestId("home-today-row")).toHaveClass(
      "xl:grid-cols-3",
      "xl:items-stretch",
    );
  });

  it("ホームは記録タブを初期表示し、URLへ同期する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/", true);

    expect(await screen.findByRole("tab", { name: "記録" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        "?tab=record",
      ),
    );
    expect(screen.getByRole("tabpanel", { name: "記録" })).toBeInTheDocument();
  });

  it("ホームタブをURLとキーボードで切り替える", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/?tab=today", true);

    const todayTab = await screen.findByRole("tab", { name: "今日" });
    expect(todayTab).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "記録" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?tab=record",
    );

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "今日" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "今日" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("不正なホームタブは記録へ戻す", async () => {
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/?tab=unknown", true);

    expect(await screen.findByRole("tab", { name: "記録" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        "?tab=record",
      ),
    );
  });

  it("API失敗時に再試行し、正常表示へ戻れる", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockImplementationOnce(() =>
        jsonResponse(
          { status: "error", message: "一時的な通信エラーです。" },
          500,
        ),
      )
      .mockImplementationOnce(() => jsonResponse(dashboardResponse));
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "一時的な通信エラーです。",
    );
    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(
      await screen.findByRole("heading", { name: "現在の活動" }),
    ).toBeInTheDocument();
  });

  it("ネットワークに接続できない場合も日本語で案内する", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "APIに接続できませんでした。通信状態を確認してください。",
    );
  });

  it("200応答でもスキーマが不正ならデータを表示しない", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        ...dashboardResponse,
        data: {
          ...dashboardResponse.data,
          quickLogs: [{ type: "wake_prompt", label: "起床", count: "1" }],
        },
      }),
    );
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ダッシュボードのデータ形式が正しくありません。",
    );
    expect(
      screen.queryByRole("heading", { name: "現在の活動" }),
    ).not.toBeInTheDocument();
  });

  it("クイック記録の連続タップでは最新の1件を取り消せる", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp();

    const recordButton = await screen.findByRole("button", {
      name: "起床の声かけを記録。現在1件",
    });
    await user.click(recordButton);
    await user.click(recordButton);
    expect(
      screen.getByRole("button", { name: "起床の声かけを記録。現在3件" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取り消す" }));
    expect(
      screen.getByRole("button", { name: "起床の声かけを記録。現在2件" }),
    ).toBeInTheDocument();
  });

  it("ホームの母の体調と気分を1クリックでローカル編集できる", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp();

    await user.click(
      await screen.findByRole("button", { name: "母の体調を5にする" }),
    );
    expect(
      screen.getByRole("button", { name: "母の体調を5にする" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "母の気分を4にする" }));
    expect(
      screen.getByRole("button", { name: "母の気分を4にする" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("娘の状態ページでは入力者区分と今日の作戦を表示・編集できる", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/child-plan");

    expect(
      await screen.findByRole("heading", { name: "娘の状態・今日の作戦" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "娘の体調と気分" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "娘の今日の作戦" }),
    ).toBeInTheDocument();
    expect(screen.getByText("難しい場合の別案")).toBeInTheDocument();
    expect(screen.getByText("今日の作戦メモ")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "娘の入力者区分を娘本人にする",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "娘の入力者区分を娘本人にする",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("今日のまとめページには生活支援の詳細2項目だけを表示する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/summary");

    expect(
      await screen.findByRole("heading", { name: "今日のまとめ" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "予定への影響" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "対応事項" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "ラストウォー" }),
    ).not.toBeInTheDocument();
  });

  it("ラストウォーは専用ページで表示する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/last-war");

    expect(
      await screen.findByRole("heading", { name: "ラストウォー" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "今日の状態" }),
    ).toBeInTheDocument();
    for (const heading of ["次に行うこと"]) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }
  });

  it("モバイルドロワーをフォーカス管理し、Escapeで閉じる", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderApp();

    const toggle = screen.getByRole("button", { name: "メニューを開く" });
    const drawer = document.getElementById("mobile-drawer");
    expect(drawer).not.toBeNull();
    const drawerElement = drawer!;
    expect(drawerElement).toHaveAttribute("aria-hidden", "true");
    expect(drawerElement).toHaveAttribute("inert");

    await user.click(toggle);
    expect(drawerElement).toHaveAttribute("aria-hidden", "false");
    expect(drawerElement).not.toHaveAttribute("inert");
    expect(
      within(drawerElement).getByRole("link", { name: "今日のまとめ" }),
    ).toBeInTheDocument();
    expect(
      within(drawerElement).getByRole("link", { name: "ラストウォー" }),
    ).toBeInTheDocument();

    const drawerHome = within(drawerElement).getByRole("link", {
      name: "ホーム",
    });
    const drawerSettings = within(drawerElement).getByRole("link", {
      name: "設定",
    });
    expect(drawerHome).toHaveFocus();
    await user.tab({ shift: true });
    expect(drawerSettings).toHaveFocus();
    await user.tab();
    expect(drawerHome).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(toggle).toHaveFocus());
    expect(drawerElement).toHaveAttribute("aria-hidden", "true");
    expect(drawerElement).toHaveAttribute("inert");
  });

  it("PCサイドバーには専用ページ、モバイル下部には6項目だけを表示する", () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderApp();

    const sidebar = screen.getByRole("navigation", { name: "メインメニュー" });
    expect(
      within(sidebar).getByRole("link", { name: "娘の状態" }),
    ).toHaveAttribute("href", "/child-plan");
    expect(
      within(sidebar).getByRole("link", { name: "今日のまとめ" }),
    ).toHaveAttribute("href", "/summary");
    expect(
      within(sidebar).getByRole("link", { name: "ラストウォー" }),
    ).toHaveAttribute("href", "/last-war");
    expect(
      within(
        screen.getByRole("navigation", { name: "モバイルメニュー" }),
      ).getAllByRole("link"),
    ).toHaveLength(6);
  });

  it("予定なしの時間を空白にせず、予定外の活動と実績記録なしを表示する", async () => {
    fetchMock.mockImplementation(() => jsonResponse(dashboardResponse));
    renderApp("/schedule-comparison");

    expect(
      await screen.findByRole("heading", { name: "今日の予定と実績" }),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText("予定なし")).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("予定外の活動").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("実績記録なし")).toBeInTheDocument();

    const firstRow = screen
      .getByText("家事")
      .closest<HTMLElement>(".comparison-grid");
    expect(firstRow).not.toBeNull();
    expect(
      within(firstRow!).getByRole("heading", { name: "予定" }),
    ).toBeInTheDocument();
    expect(
      within(firstRow!).getByRole("heading", { name: "実績" }),
    ).toBeInTheDocument();
    expect(
      within(firstRow!).getByRole("heading", { name: "差分・原因" }),
    ).toBeInTheDocument();
  });

  it("比較データが空でも正常な空状態を表示する", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        ...dashboardResponse,
        data: { ...dashboardResponse.data, scheduleComparisons: [] },
      }),
    );
    renderApp("/schedule-comparison");

    await waitFor(() =>
      expect(
        screen.getByText("比較するデータはありません"),
      ).toBeInTheDocument(),
    );
  });
});
