import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ChildPlanPage } from "./pages/ChildPlanPage";
import { HomePage } from "./pages/HomePage";
import { KoekakePage } from "./pages/KoekakePage";
import { MusumePage } from "./pages/MusumePage";
import { LastWarPage } from "./pages/LastWarPage";
import { MamaKajiLayout } from "./pages/MamaKajiLayout";
import { MamaKajiPage } from "./pages/MamaKajiPage";
import { MamaKajiZukanPage } from "./pages/MamaKajiZukanPage";
import { MamaStatePage } from "./pages/MamaStatePage";
import { OshigotoPage } from "./pages/OshigotoPage";
import { OshigotoUsjPage } from "./pages/OshigotoUsjPage";
import { OshigotoZukanPage } from "./pages/OshigotoZukanPage";
import { NotFoundPage } from "./pages/PlaceholderPage";
import { RecordsPage } from "./pages/RecordsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ScheduleComparisonPage } from "./pages/ScheduleComparisonPage";
import { SchedulePage } from "./pages/SchedulePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SummaryPage } from "./pages/SummaryPage";
import { SupportPage } from "./pages/SupportPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="schedule-comparison"
          element={<ScheduleComparisonPage />}
        />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="records" element={<RecordsPage scope="all" />} />
        <Route path="records/musume" element={<RecordsPage scope="child" />} />
        <Route path="mama-kaji" element={<MamaKajiLayout />}>
          <Route index element={<MamaKajiPage />} />
          <Route path="zukan" element={<MamaKajiZukanPage />} />
        </Route>
        <Route path="child-plan" element={<ChildPlanPage />} />
        <Route path="mama-state" element={<MamaStatePage />} />
        <Route path="musume" element={<MusumePage />} />
        <Route path="koekake" element={<KoekakePage />} />
        <Route path="oshigoto" element={<OshigotoPage />} />
        <Route path="oshigoto/zukan" element={<OshigotoZukanPage />} />
        <Route path="oshigoto/usj" element={<OshigotoUsjPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="last-war" element={<LastWarPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
