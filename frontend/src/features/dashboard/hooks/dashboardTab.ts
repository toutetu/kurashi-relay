export const dashboardTabs = [
  { value: "record", label: "記録" },
  { value: "today", label: "今日" },
] as const;

export type DashboardTab = (typeof dashboardTabs)[number]["value"];

export function getDashboardTab(value: string | null): DashboardTab {
  return dashboardTabs.some((tab) => tab.value === value)
    ? (value as DashboardTab)
    : "record";
}
