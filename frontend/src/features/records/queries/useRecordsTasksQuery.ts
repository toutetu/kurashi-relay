import { useQuery } from "@tanstack/react-query";
import { getTasks } from "../../../api/oshigoto";
import type { Member } from "../../../api/schemas/oshigotoSchema";

export function recordsTasksQueryKey(member: Member, date: string) {
  return ["tasks", member, date] as const;
}

export function useRecordsTasksQuery(member: Member, date: string) {
  return useQuery({
    queryKey: recordsTasksQueryKey(member, date),
    queryFn: ({ signal }) => getTasks(member, date, signal),
    staleTime: 30_000,
  });
}
