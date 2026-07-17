import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ChildPlanPage } from "./pages/ChildPlanPage";
import { HomePage } from "./pages/HomePage";
import { KoekakePage } from "./pages/KoekakePage";
import { LastWarPage } from "./pages/LastWarPage";
import { MamaKajiLayout } from "./pages/MamaKajiLayout";
import { MamaKajiPage } from "./pages/MamaKajiPage";
import { MamaKajiZukanPage } from "./pages/MamaKajiZukanPage";
import { OshigotoPage } from "./pages/OshigotoPage";
import { OshigotoUsjPage } from "./pages/OshigotoUsjPage";
import { OshigotoZukanPage } from "./pages/OshigotoZukanPage";
import { NotFoundPage, PlaceholderPage } from "./pages/PlaceholderPage";
import { RecordsPage } from "./pages/RecordsPage";
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
        <Route path="records" element={<RecordsPage />} />
        <Route path="mama-kaji" element={<MamaKajiLayout />}>
          <Route index element={<MamaKajiPage />} />
          <Route path="zukan" element={<MamaKajiZukanPage />} />
        </Route>
        <Route path="child-plan" element={<ChildPlanPage />} />
        <Route path="koekake" element={<KoekakePage />} />
        <Route path="oshigoto" element={<OshigotoPage />} />
        <Route path="oshigoto/zukan" element={<OshigotoZukanPage />} />
        <Route path="oshigoto/usj" element={<OshigotoUsjPage />} />
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
