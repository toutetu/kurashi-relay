import { createInertiaApp } from "@inertiajs/react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { MoodProvider } from "@/features/mood/mood";
import "@/index.css";

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
    createRoot(el).render(
      <MoodProvider>
        <App {...props} />
      </MoodProvider>,
    );
  },
  progress: {
    color: "#5b8def",
  },
});
