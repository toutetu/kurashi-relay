import { createInertiaApp } from "@inertiajs/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { setInertiaSessionAuth, setInertiaPathPrefix } from "@/api/inertiaAuth";
import { MoodProvider } from "@/features/mood/mood";
import type { SharedPageProps } from "@/inertia/types";
import { AppPathProvider } from "@/navigation/AppPathContext";
import { resolveInertiaUrlPrefix } from "@/navigation/inertiaPath";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob<{ default: ComponentType }>(
      "./pages/**/*.tsx",
      { eager: true },
    );
    const page = pages[`./pages/${name}.tsx`];

    if (!page) {
      throw new Error(`Inertia page not found: ${name}`);
    }

    return page.default;
  },
  setup({ el, App, props }) {
    const pageProps = props.initialPage.props as unknown as SharedPageProps;
    const pathPrefix = resolveInertiaUrlPrefix(pageProps.app.inertiaPrefix);
    setInertiaSessionAuth(pageProps.auth?.verified === true);
    setInertiaPathPrefix(pathPrefix);

    createRoot(el).render(
      <QueryClientProvider client={queryClient}>
        <AppPathProvider value={{ mode: "inertia", pathPrefix }}>
          <MoodProvider>
            <App {...props} />
          </MoodProvider>
        </AppPathProvider>
      </QueryClientProvider>,
    );
  },
  progress: {
    color: "#5b8def",
  },
});
