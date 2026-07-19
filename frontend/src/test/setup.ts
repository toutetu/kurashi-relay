import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { resetFamilyTokenStateForTests } from "../api/familyToken";

afterEach(() => {
  cleanup();
  resetFamilyTokenStateForTests();
  vi.useRealTimers();
});
