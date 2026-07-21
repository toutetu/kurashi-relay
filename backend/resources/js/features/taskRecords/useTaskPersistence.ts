import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client";
import {
  cancelTaskRecord,
  createTaskRecord,
} from "../../api/oshigoto";
import {
  enqueueOperation,
  findLatestPendingCreate,
  getOperationId,
  loadQueue,
  markRewardRevealed,
  removeOperation,
  saveSnapshot,
  wasRewardRevealed,
  type PendingCancel,
  type PendingCreate,
  type PendingOperation,
} from "../../api/oshigotoStorage";
import type {
  Member,
  RevealedReward,
  TasksData,
} from "../../api/schemas/oshigotoSchema";
import {
  isTransientApiError,
  tasksQueryKey,
  useCancelTaskRecord,
  useCreateTaskRecord,
  useTasksQuery,
} from "./queries";

type SyncStatus = "idle" | "saving" | "deferred" | "saved" | "error";

const SYNC_TEXT: Record<Exclude<SyncStatus, "idle" | "error">, string> = {
  saving: "保存中…",
  deferred: "あとで保存します",
  saved: "保存できました",
};

function neutralErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 200) return error.message;
  return "うまく保存できませんでした。もう一度試してね";
}

function decrementSummary(summary: TasksData["summary"]) {
  return {
    ...summary,
    today_done_count: Math.max(0, summary.today_done_count - 1),
    gauge_count:
      (summary.gauge_count - 1 + summary.gauge_size) % summary.gauge_size,
  };
}

export function useTaskPersistence(member: Member) {
  const queryClient = useQueryClient();
  const query = useTasksQuery(member);
  const refetchTasks = query.refetch;
  const createMutation = useCreateTaskRecord(member);
  const cancelMutation = useCancelTaskRecord(member);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealedReward, setRevealedReward] =
    useState<RevealedReward | null>(null);
  const [gaugeOverride, setGaugeOverride] = useState<number | null>(null);
  const inFlightRef = useRef(new Set<string>());
  const pendingUndoRef = useRef(new Set<string>());
  const flushingRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushQueueRef = useRef<() => Promise<void>>(async () => undefined);
  const runCancelRef = useRef<
    (operation: PendingCancel) => Promise<void>
  >(async () => undefined);

  const updateCachedData = useCallback(
    (updater: (current: TasksData) => TasksData, synced: boolean) => {
      let updated: TasksData | undefined;
      queryClient.setQueryData<TasksData>(
        tasksQueryKey(member),
        (current) => {
          if (!current) return current;
          updated = updater(current);
          return updated;
        },
      );
      if (updated) saveSnapshot(updated, synced);
    },
    [member, queryClient],
  );

  const showSavedTemporarily = useCallback(() => {
    setSyncStatus("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      savedTimerRef.current = null;
      setSyncStatus("idle");
    }, 2500);
  }, []);

  const scheduleReward = useCallback(
    (reward: RevealedReward | null, gaugeSize: number) => {
      if (
        !reward ||
        wasRewardRevealed(member, reward.milestone_number)
      ) {
        return;
      }
      setGaugeOverride(gaugeSize);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        revealTimerRef.current = null;
        markRewardRevealed(member, reward.milestone_number);
        setRevealedReward(reward);
      }, 800);
    },
    [member],
  );

  const applyCreateResult = useCallback(
    (
      operation: PendingCreate,
      result: Awaited<ReturnType<typeof createTaskRecord>>,
    ) => {
      const operationId = getOperationId(operation);
      if (pendingUndoRef.current.has(operationId)) {
        pendingUndoRef.current.delete(operationId);

        const cancelOperation: PendingCancel = {
          kind: "cancel",
          member,
          recordId: result.record.id,
          createdAt: new Date().toISOString(),
        };
        enqueueOperation(cancelOperation);
        void runCancelRef.current(cancelOperation);
        return;
      }

      updateCachedData(
        (data) => ({
          ...data,
          tasks: data.tasks.map((task) =>
            task.slug === operation.task
              ? {
                  ...task,
                  last_record_id: result.record.id,
                }
              : task,
          ),
          summary: result.summary,
        }),
        true,
      );
      scheduleReward(result.revealed_reward, result.summary.gauge_size);
    },
    [member, scheduleReward, updateCachedData],
  );

  const applyCancelResult = useCallback(
    (
      operation: PendingCancel,
      result: Awaited<ReturnType<typeof cancelTaskRecord>>,
    ) => {
      updateCachedData(
        (data) => ({
          ...data,
          tasks: data.tasks.map((task) =>
            task.slug === result.record.task
              ? {
                  ...task,
                  last_record_id:
                    task.last_record_id === operation.recordId
                      ? null
                      : task.last_record_id,
                }
              : task,
          ),
          summary: result.summary,
        }),
        true,
      );
      setGaugeOverride(null);
      const updated = queryClient.getQueryData<TasksData>(tasksQueryKey(member));
      const task = updated?.tasks.find(
        (item) => item.slug === result.record.task,
      );
      if (task && task.count > 0) {
        void refetchTasks();
      }
    },
    [member, queryClient, refetchTasks, updateCachedData],
  );

  const recoverFromDefinitiveError = useCallback(
    (operation: PendingOperation, error: unknown) => {
      if (operation.kind === "create") {
        pendingUndoRef.current.delete(getOperationId(operation));
      }
      removeOperation(operation);
      setGaugeOverride(null);
      setSyncStatus("error");
      setErrorMessage(neutralErrorMessage(error));
      void refetchTasks();
    },
    [refetchTasks],
  );

  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    const initialQueue = loadQueue(member);
    if (initialQueue.length === 0) return;

    flushingRef.current = true;
    setSyncStatus("saving");
    setErrorMessage(null);
    try {
      while (true) {
        const operation = loadQueue(member)[0];
        if (!operation) {
          showSavedTemporarily();
          return;
        }
        if (inFlightRef.current.has(getOperationId(operation))) return;

        try {
          if (operation.kind === "create") {
            const result = await createTaskRecord({
              member,
              task: operation.task,
              date: operation.date,
              idempotency_key: operation.idempotencyKey,
              source: "web",
              ...(operation.note ? { note: operation.note } : {}),
            });
            removeOperation(operation);
            applyCreateResult(operation, result);
          } else {
            const result = await cancelTaskRecord(operation.recordId);
            removeOperation(operation);
            applyCancelResult(operation, result);
          }
        } catch (error) {
          if (isTransientApiError(error)) {
            setSyncStatus("deferred");
            return;
          }
          recoverFromDefinitiveError(operation, error);
          return;
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [
    applyCancelResult,
    applyCreateResult,
    member,
    recoverFromDefinitiveError,
    showSavedTemporarily,
  ]);

  useEffect(() => {
    flushQueueRef.current = flushQueue;
  }, [flushQueue]);

  const runCreate = useCallback(
    async (operation: PendingCreate) => {
      const operationId = getOperationId(operation);
      inFlightRef.current.add(operationId);
      setSyncStatus("saving");
      setErrorMessage(null);
      try {
        const result = await createMutation.mutateAsync(operation);
        removeOperation(operation);
        applyCreateResult(operation, result);
        setSyncStatus("idle");
        void flushQueueRef.current();
      } catch (error) {
        if (isTransientApiError(error)) {
          if (loadQueue(member).some(
            (item) => getOperationId(item) === operationId,
          )) {
            setSyncStatus("deferred");
          } else {
            setSyncStatus("idle");
          }
        } else {
          recoverFromDefinitiveError(operation, error);
        }
      } finally {
        inFlightRef.current.delete(operationId);
      }
    },
    [applyCreateResult, createMutation, member, recoverFromDefinitiveError],
  );

  const runCancel = useCallback(
    async (operation: PendingCancel) => {
      const operationId = getOperationId(operation);
      inFlightRef.current.add(operationId);
      setSyncStatus("saving");
      setErrorMessage(null);
      try {
        const result = await cancelMutation.mutateAsync(operation);
        removeOperation(operation);
        applyCancelResult(operation, result);
        setSyncStatus("idle");
        void flushQueueRef.current();
      } catch (error) {
        if (isTransientApiError(error)) {
          setSyncStatus("deferred");
        } else {
          recoverFromDefinitiveError(operation, error);
        }
      } finally {
        inFlightRef.current.delete(operationId);
      }
    },
    [applyCancelResult, cancelMutation, recoverFromDefinitiveError],
  );

  useEffect(() => {
    runCancelRef.current = runCancel;
  }, [runCancel]);

  const incrementTask = useCallback(
    (slug: string, note?: string | null) => {
      const data = queryClient.getQueryData<TasksData>(tasksQueryKey(member));
      const task = data?.tasks.find((item) => item.slug === slug);
      if (!data || !task) return;

      setGaugeOverride(null);
      setErrorMessage(null);

      const trimmedNote =
        typeof note === "string" && note.trim() !== "" ? note.trim() : null;

      const operation: PendingCreate = {
        kind: "create",
        member,
        task: slug,
        date: data.date,
        idempotencyKey: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };
      enqueueOperation(operation);
      updateCachedData(
        (current) => ({
          ...current,
          tasks: current.tasks.map((item) =>
            item.slug === slug
              ? { ...item, count: item.count + 1 }
              : item,
          ),
          summary: {
            ...current.summary,
            today_done_count: current.summary.today_done_count + 1,
            gauge_count: Math.min(
              current.summary.gauge_size,
              current.summary.gauge_count + 1,
            ),
          },
        }),
        false,
      );
      void runCreate(operation);
    },
    [member, queryClient, runCreate, updateCachedData],
  );

  const decrementTask = useCallback(
    (slug: string) => {
      const data = queryClient.getQueryData<TasksData>(tasksQueryKey(member));
      const task = data?.tasks.find((item) => item.slug === slug);
      if (!data || !task || task.count <= 0) return;

      setGaugeOverride(null);
      setErrorMessage(null);

      const pendingCreate = findLatestPendingCreate(
        member,
        slug,
        data.date,
        pendingUndoRef.current,
      );
      if (pendingCreate) {
        const operationId = getOperationId(pendingCreate);
        if (inFlightRef.current.has(operationId)) {
          pendingUndoRef.current.add(operationId);
        } else {
          removeOperation(pendingCreate);
          if (loadQueue(member).length === 0) setSyncStatus("idle");
        }
        updateCachedData(
          (current) => ({
            ...current,
            tasks: current.tasks.map((item) =>
              item.slug === slug
                ? { ...item, count: Math.max(0, item.count - 1) }
                : item,
            ),
            summary: decrementSummary(current.summary),
          }),
          false,
        );
        return;
      }

      if (task.last_record_id === null) return;

      updateCachedData(
        (current) => ({
          ...current,
          tasks: current.tasks.map((item) =>
            item.slug === slug
              ? { ...item, count: Math.max(0, item.count - 1) }
              : item,
          ),
          summary: decrementSummary(current.summary),
        }),
        false,
      );

      const operation: PendingCancel = {
        kind: "cancel",
        member,
        recordId: task.last_record_id,
        createdAt: new Date().toISOString(),
      };
      enqueueOperation(operation);
      void runCancel(operation);
    },
    [member, queryClient, runCancel, updateCachedData],
  );

  useEffect(() => {
    queueMicrotask(() => void flushQueueRef.current());
    const handleOnline = () => void flushQueueRef.current();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [member]);

  useEffect(
    () => () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  const closeReveal = useCallback(() => {
    setRevealedReward(null);
    setGaugeOverride(null);
  }, []);

  const effectiveSyncStatus =
    syncStatus === "idle" && query.isError && query.data
      ? "deferred"
      : syncStatus;
  const syncText =
    effectiveSyncStatus === "idle" || effectiveSyncStatus === "error"
      ? null
      : SYNC_TEXT[effectiveSyncStatus];

  return {
    ...query,
    incrementTask,
    decrementTask,
    revealedReward,
    closeReveal,
    gaugeCount: gaugeOverride ?? query.data?.summary.gauge_count ?? 0,
    syncText,
    saveError: errorMessage,
  };
}
