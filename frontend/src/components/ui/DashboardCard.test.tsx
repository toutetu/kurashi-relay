import { render, screen } from "@testing-library/react";
import { Heart } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DashboardCard } from "./DashboardCard";

describe("DashboardCard", () => {
  it("toneを共通スタイルへ渡し、段内の高さに追従する", () => {
    render(
      <DashboardCard title="状態" icon={Heart} tone="red" density="compact">
        内容
      </DashboardCard>,
    );

    const card = screen
      .getByRole("heading", { name: "状態" })
      .closest("section");
    expect(card).toHaveClass(
      "dashboard-card",
      "dashboard-card--tone-red",
      "h-full",
      "w-full",
      "min-w-0",
      "justify-self-stretch",
    );
    expect(card?.querySelector(".dashboard-card__icon")).toBeInTheDocument();
  });
});
