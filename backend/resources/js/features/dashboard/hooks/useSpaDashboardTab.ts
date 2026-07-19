import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getDashboardTab,
  type DashboardTab,
} from "./dashboardTab";

export function useSpaDashboardTab(): [DashboardTab, (tab: DashboardTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab = getDashboardTab(rawTab);

  useEffect(() => {
    if (rawTab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, rawTab, searchParams, setSearchParams]);

  const selectTab = useCallback(
    (tab: DashboardTab) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  return [activeTab, selectTab];
}
