import { router, usePage } from "@inertiajs/react";
import { useCallback } from "react";
import { useAppPathContext } from "@/navigation/AppPathContext";
import {
  getDashboardTab,
  type DashboardTab,
} from "./dashboardTab";

export function useInertiaDashboardTab(): [
  DashboardTab,
  (tab: DashboardTab) => void,
] {
  const { url } = usePage();
  const { pathPrefix } = useAppPathContext();
  const homePath = pathPrefix === "" ? "/" : pathPrefix;
  const query = url.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const activeTab = getDashboardTab(params.get("tab"));

  const selectTab = useCallback(
    (tab: DashboardTab) => {
      router.get(
        homePath,
        { tab },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
        },
      );
    },
    [homePath],
  );

  return [activeTab, selectTab];
}
