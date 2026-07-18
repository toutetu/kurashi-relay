import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { isTransientApiError } from "./queries";

describe("isTransientApiError", () => {
  it.each([0, 408, 425, 429, 500, 503])(
    "status %i は同じ冪等キーで再送する",
    (status) => {
      expect(isTransientApiError(new ApiError("temporary", status))).toBe(true);
    },
  );

  it.each([200, 400, 409, 422])(
    "status %i は確定エラーとして扱う",
    (status) => {
      expect(isTransientApiError(new ApiError("definitive", status))).toBe(
        false,
      );
    },
  );

  it("ApiError以外は再送判定にしない", () => {
    expect(isTransientApiError(new Error("unexpected"))).toBe(false);
  });
});
