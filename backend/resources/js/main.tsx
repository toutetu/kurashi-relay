import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ApiError } from "./api/client";
import { FamilyTokenProvider } from "./features/auth/FamilyTokenProvider";
import { MoodProvider } from "./features/mood/mood";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401/429 は再試行するとあいことば制限を消費するため止める。
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 429)
        ) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FamilyTokenProvider>
        <BrowserRouter>
          <MoodProvider>
            <App />
          </MoodProvider>
        </BrowserRouter>
      </FamilyTokenProvider>
    </QueryClientProvider>
  </StrictMode>,
);
