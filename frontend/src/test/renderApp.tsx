/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../App";
import { MoodProvider } from "../features/mood/mood";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

export function renderApp(path = "/", showLocation = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MoodProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
          {showLocation && <LocationProbe />}
        </MemoryRouter>
      </MoodProvider>
    </QueryClientProvider>,
  );
}
