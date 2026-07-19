import { useQuery } from "@tanstack/react-query";
import { getTaskRecords } from "../../../api/oshigoto";
import type { Member } from "../../../api/schemas/oshigotoSchema";

export function recordsTimelineQueryKey(member: Member, date: string) {
  return ["task-records", member, date] as const;
}

export function useRecordsTimelineQuery(member: Member, date: string) {
  return useQuery({
    queryKey: recordsTimelineQueryKey(member, date),
    queryFn: ({ signal }) => getTaskRecords(member, date, signal),
    staleTime: 30_000,
  });
}
