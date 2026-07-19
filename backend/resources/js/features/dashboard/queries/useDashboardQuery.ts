import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../../../api/dashboard";

export function useDashboardQuery(date?: string) {
  return useQuery({
    queryKey: ["dashboard", date ?? "default"],
    queryFn: ({ signal }) => getDashboard(date, signal),
    staleTime: 30_000,
  });
}
