import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureFamilyTokenAuth,
  getFamilyToken,
  requireFamilyToken,
  resetFamilyTokenStateForTests,
  saveFamilyToken,
} from "../../api/familyToken";
import { SettingsPage } from "../../pages/SettingsPage";
import { FamilyTokenProvider } from "./FamilyTokenProvider";

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FamilyTokenProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </FamilyTokenProvider>
    </QueryClientProvider>,
  );
}

describe("FamilyTokenProvider", () => {
  afterEach(() => {
    resetFamilyTokenStateForTests();
  });

  it("設定画面から入力・変更・端末保存解除ができる", async () => {
    const user = userEvent.setup();
    renderSettings();

    expect(screen.getByRole("status")).toHaveTextContent("保存されていません");
    await user.click(screen.getByRole("button", { name: "あいことばを入力" }));
    await user.type(screen.getByLabelText("あいことば"), "  family-secret  ");
    await user.click(screen.getByRole("button", { name: "保存してつづける" }));

    expect(getFamilyToken()).toBe("family-secret");
    expect(screen.getByRole("status")).toHaveTextContent(
      "この端末に保存されています",
    );
    await user.click(screen.getByRole("button", { name: "この端末から削除" }));
    expect(getFamilyToken()).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("保存されていません");
  });

  it("401通知後は入力するまで閉じられない", async () => {
    saveFamilyToken("old-secret");
    renderSettings();

    act(() => requireFamilyToken(captureFamilyTokenAuth()));

    expect(
      await screen.findByRole("dialog", { name: "あいことばを入力" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "キャンセル" }),
    ).not.toBeInTheDocument();
  });

  it("401通知で入力中の文字列を消さない", async () => {
    saveFamilyToken("old-secret");
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "あいことばを変更" }));
    await user.type(screen.getByLabelText("あいことば"), "typing-secret");

    act(() => requireFamilyToken(captureFamilyTokenAuth()));

    expect(screen.getByLabelText("あいことば")).toHaveValue("typing-secret");
    expect(
      screen.queryByRole("button", { name: "キャンセル" }),
    ).not.toBeInTheDocument();
  });

  it("保存後に届いたstale 401でダイアログを再表示しない", async () => {
    saveFamilyToken("old-secret");
    const staleSnapshot = captureFamilyTokenAuth();
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "あいことばを変更" }));
    await user.clear(screen.getByLabelText("あいことば"));
    await user.type(screen.getByLabelText("あいことば"), "new-secret");
    await user.click(screen.getByRole("button", { name: "保存してつづける" }));

    expect(getFamilyToken()).toBe("new-secret");
    expect(
      screen.queryByRole("dialog", { name: "あいことばを入力" }),
    ).not.toBeInTheDocument();

    act(() => requireFamilyToken(staleSnapshot));

    expect(getFamilyToken()).toBe("new-secret");
    expect(
      screen.queryByRole("dialog", { name: "あいことばを入力" }),
    ).not.toBeInTheDocument();
  });

  it("同じ値を再保存した後に届いた遅延401でダイアログを再表示しない", async () => {
    saveFamilyToken("same-secret");
    const staleSnapshot = captureFamilyTokenAuth();
    const user = userEvent.setup();
    renderSettings();

    act(() => requireFamilyToken(staleSnapshot));
    expect(
      await screen.findByRole("dialog", { name: "あいことばを入力" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("あいことば"), "same-secret");
    await user.click(screen.getByRole("button", { name: "保存してつづける" }));

    expect(getFamilyToken()).toBe("same-secret");
    expect(
      screen.queryByRole("dialog", { name: "あいことばを入力" }),
    ).not.toBeInTheDocument();

    act(() => requireFamilyToken(staleSnapshot));

    expect(getFamilyToken()).toBe("same-secret");
    expect(
      screen.queryByRole("dialog", { name: "あいことばを入力" }),
    ).not.toBeInTheDocument();
  });
});
