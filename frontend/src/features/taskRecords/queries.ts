import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError } from "../../api/client";
import {
  cancelTaskRecord,
  createTaskRecord,
  getTasks,
} from "../../api/oshigoto";
import {
  loadLatestSnapshot,
  loadQueue,
  saveSnapshot,
  type PendingCancel,
  type PendingCreate,
} from "../../api/oshigotoStorage";
import type { Member } from "../../api/schemas/oshigotoSchema";

export function tasksQueryKey(member: Member) {
  return ["tasks", member] as const;
}

export function isTransientApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

export function useTasksQuery(member: Member) {
  const snapshot = useMemo(() => loadLatestSnapshot(member), [member]);
  return useQuery({
    queryKey: tasksQueryKey(member),
    queryFn: async ({ signal }) => {
      const data = await getTasks(member, undefined, signal);
      saveSnapshot(data, true);
      return data;
    },
    staleTime: 30_000,
    initialData: snapshot?.data,
    initialDataUpdatedAt: snapshot?.savedAt ?? 0,
  });
}

export function useCreateTaskRecord(member: Member) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operation: PendingCreate) =>
      createTaskRecord({
        member,
        task: operation.task,
        idempotency_key: operation.idempotencyKey,
        source: "web",
      }),
    onSettled: (_data, error) => {
      if (isTransientApiError(error) && loadQueue(member).length > 0) return;
      void queryClient.invalidateQueries({
        queryKey: tasksQueryKey(member),
        refetchType: "none",
      });
    },
  });
}

export function useCancelTaskRecord(member: Member) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operation: PendingCancel) =>
      cancelTaskRecord(operation.recordId),
    onSettled: (_data, error) => {
      if (isTransientApiError(error) && loadQueue(member).length > 0) return;
      void queryClient.invalidateQueries({
        queryKey: tasksQueryKey(member),
        refetchType: "none",
      });
    },
  });
}
