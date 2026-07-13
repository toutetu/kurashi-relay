import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ChildPlanPage } from "./pages/ChildPlanPage";
import { HomePage } from "./pages/HomePage";
import { LastWarPage } from "./pages/LastWarPage";
import { NotFoundPage, PlaceholderPage } from "./pages/PlaceholderPage";
import { ScheduleComparisonPage } from "./pages/ScheduleComparisonPage";
import { SummaryPage } from "./pages/SummaryPage";

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
        <Route path="child-plan" element={<ChildPlanPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="last-war" element={<LastWarPage />} />
        <Route path="support" element={<PlaceholderPage page="support" />} />
        <Route path="reports" element={<PlaceholderPage page="reports" />} />
        <Route path="settings" element={<PlaceholderPage page="settings" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
