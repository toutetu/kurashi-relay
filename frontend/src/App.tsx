import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage, PlaceholderPage } from "./pages/PlaceholderPage";
import { ScheduleComparisonPage } from "./pages/ScheduleComparisonPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="schedule-comparison"
          element={<ScheduleComparisonPage />}
        />
        <Route path="schedule" element={<PlaceholderPage page="schedule" />} />
        <Route path="records" element={<PlaceholderPage page="records" />} />
        <Route
          path="child-plan"
          element={<PlaceholderPage page="childPlan" />}
        />
        <Route path="support" element={<PlaceholderPage page="support" />} />
        <Route path="reports" element={<PlaceholderPage page="reports" />} />
        <Route path="settings" element={<PlaceholderPage page="settings" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
