import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalActivity } from "../../../types/local";
import { CurrentActivityCard, QuickLogsCard } from "./DashboardCards";

function ActivityHarness() {
  const [activity, setActivity] = useState<LocalActivity>({
    id: "local-activity",
    title: "就労準備",
    category: "work_preparation",
    startedAt: "2026-07-13T09:00:00+09:00",
    status: "running",
    relatedPlanTitle: null,
    pausedAt: null,
    completedAt: null,
    totalPausedMilliseconds: 0,
  });

  return (
    <CurrentActivityCard
      activity={activity}
      onChange={(nextActivity) => {
        if (nextActivity) setActivity(nextActivity);
      }}
    />
  );
}

describe("ダッシュボードのローカル操作", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("一時停止中の時間を経過時間から除外する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00+09:00"));
    render(<ActivityHarness />);

    expect(screen.getByText("1時間")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));

    act(() => vi.advanceTimersByTime(30 * 60 * 1000));
    expect(screen.getByText("1時間")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "再開" }));
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByText("1時間")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30 * 60 * 1000));
    expect(screen.getByText("1時間30分")).toBeInTheDocument();
  });

  it("Undoは最後の連続タップから5秒後に失効する", async () => {
    vi.useFakeTimers();
    render(
      <QuickLogsCard
        initialLogs={[{ type: "wake_prompt", label: "起床の声かけ", count: 1 }]}
      />,
    );

    const recordButton = screen.getByRole("button", {
      name: "起床の声かけを記録。現在1件",
    });
    fireEvent.click(recordButton);
    act(() => vi.advanceTimersByTime(4_000));
    fireEvent.click(recordButton);

    act(() => vi.advanceTimersByTime(4_999));
    expect(
      screen.getByRole("button", { name: "取り消す" }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2));
    expect(
      screen.queryByRole("button", { name: "取り消す" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "起床の声かけを記録。現在3件",
      }),
    ).toBeInTheDocument();
  });
});
