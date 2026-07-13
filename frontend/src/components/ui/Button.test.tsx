import { render, screen } from "@testing-library/react";
import { RefreshCcw } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("共通の押下スタイルと処理中の状態を提供する", () => {
    render(
      <Button icon={RefreshCcw} loading tone="blue" variant="outline">
        更新中…
      </Button>,
    );

    const button = screen.getByRole("button", { name: "更新中…" });
    expect(button).toHaveClass(
      "button",
      "button--variant-outline",
      "button--tone-blue",
      "pressable",
    );
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
