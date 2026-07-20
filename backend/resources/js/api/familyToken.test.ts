import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureFamilyTokenAuth,
  clearFamilyToken,
  getFamilyToken,
  requireFamilyToken,
  resetFamilyTokenStateForTests,
  saveFamilyToken,
  subscribeFamilyTokenRequired,
} from "./familyToken";

describe("familyToken storage", () => {
  afterEach(() => {
    resetFamilyTokenStateForTests();
    vi.restoreAllMocks();
  });

  it("localStorage読取失敗時はメモリ上の値を返す", () => {
    saveFamilyToken("memory-secret");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(getFamilyToken()).toBe("memory-secret");
  });

  it("localStorage書込失敗時もメモリ上の新しい値で継続する", () => {
    saveFamilyToken("old-secret");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    saveFamilyToken("new-secret");

    expect(getFamilyToken()).toBe("new-secret");
  });

  it("localStorage削除失敗時もメモリ上の値は破棄する", () => {
    saveFamilyToken("to-clear");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    clearFamilyToken();

    expect(getFamilyToken()).toBeNull();
  });

  it("並行401でも再認証要求は一度だけ通知する", () => {
    saveFamilyToken("old-secret");
    const snapshot = captureFamilyTokenAuth();
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);

    requireFamilyToken(snapshot);
    requireFamilyToken(snapshot);

    expect(onRequired).toHaveBeenCalledOnce();
    expect(getFamilyToken()).toBeNull();
    unsubscribe();
  });

  it("保存後に届いたstale 401は無視する", () => {
    saveFamilyToken("old-secret");
    const snapshot = captureFamilyTokenAuth();
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);

    saveFamilyToken("new-secret");
    requireFamilyToken(snapshot);

    expect(onRequired).not.toHaveBeenCalled();
    expect(getFamilyToken()).toBe("new-secret");
    unsubscribe();
  });

  it("同じ値を再保存した後に届いた遅延401は無視する", () => {
    saveFamilyToken("same-secret");
    const snapshot = captureFamilyTokenAuth();
    const onRequired = vi.fn();
    const unsubscribe = subscribeFamilyTokenRequired(onRequired);

    requireFamilyToken(snapshot);
    saveFamilyToken("same-secret");
    requireFamilyToken(snapshot);

    expect(onRequired).toHaveBeenCalledOnce();
    expect(getFamilyToken()).toBe("same-secret");
    unsubscribe();
  });
});
