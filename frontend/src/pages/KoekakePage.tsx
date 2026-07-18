import { MessageCircleHeart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import type {
  CompletionStatus,
  KoekakePhase,
  KoekakeTaskSummary,
  PromptSource,
} from "../api/schemas/koekakeSchema";
import { DashboardError } from "../components/ui/AsyncStates";
import { formatDate, getTokyoToday } from "../utils/date";
import { KoekakeDetailSheet } from "../features/koekake/components/KoekakeDetailSheet";
import { KoekakePhaseTabs } from "../features/koekake/components/KoekakePhaseTabs";
import { KoekakeTaskCard } from "../features/koekake/components/KoekakeTaskCard";
import { KoekakeUndoToast } from "../features/koekake/components/KoekakeUndoToast";
import {
  koekakeTasksQueryKey,
  useCancelPromptEvent,
  useCreatePromptEvent,
  useKoekakeTaskQuery,
  useKoekakeTasksQuery,
  useSnooze,
  useUpdateCompletion,
} from "../features/koekake/queries";
import {
  buildDefaultPromptPayload,
  getInitialKoekakePhase,
  getKoekakeMutationErrorMessage,
  KOEKAKE_PHASE_TABS,
} from "../features/koekake/utils";

const UNDO_TIMEOUT_MS = 10_000;

type PendingUndo = {
  taskId: number;
  taskName: string;
  promptEventId: number;
};

export function KoekakePage() {
  const today = getTokyoToday();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<KoekakePhase>(() => getInitialKoekakePhase());
  const [detailTask, setDetailTask] = useState<KoekakeTaskSummary | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tasksQuery = useKoekakeTasksQuery(today, phase);
  const detailQuery = useKoekakeTaskQuery(detailTask?.id ?? null);
  const createPrompt = useCreatePromptEvent(today, phase);
  const cancelPrompt = useCancelPromptEvent(today, phase);
  const snoozeMutation = useSnooze(today, phase);
  const completionMutation = useUpdateCompletion(today, phase);

  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    [],
  );

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const scheduleUndo = (undo: PendingUndo) => {
    clearUndoTimer();
    setPendingUndo(undo);
    setUndoError(null);
    undoTimerRef.current = setTimeout(() => {
      setPendingUndo(null);
      setUndoError(null);
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  };

  const submitPrompt = async (
    task: KoekakeTaskSummary,
    promptText: string,
    source: PromptSource,
  ) => {
    setActionError(null);
    try {
      const response = await createPrompt.mutateAsync({
        daily_task_id: task.id,
        prompt_text: promptText,
        source,
        idempotency_key: crypto.randomUUID(),
      });
      scheduleUndo({
        taskId: task.id,
        taskName: task.name,
        promptEventId: response.prompt_event_id,
      });
    } catch (error) {
      setActionError(getKoekakeMutationErrorMessage(error));
    }
  };

  const handleCardPrompt = (task: KoekakeTaskSummary) => {
    const list = queryClient.getQueryData<{
      date: string;
      tasks: KoekakeTaskSummary[];
    }>(koekakeTasksQueryKey(today, phase));
    const latestTask = list?.tasks.find((item) => item.id === task.id) ?? task;
    const payload = buildDefaultPromptPayload(latestTask);
    void submitPrompt(latestTask, payload.prompt_text, payload.source);
  };

  const handleCardSnooze = async (task: KoekakeTaskSummary) => {
    setActionError(null);
    try {
      await snoozeMutation.mutateAsync({
        taskId: task.id,
        body: { minutes: 5 },
      });
    } catch (error) {
      setActionError(getKoekakeMutationErrorMessage(error));
    }
  };

  const handleUndo = async () => {
    if (!pendingUndo) return;
    clearUndoTimer();
    setUndoError(null);
    const undo = pendingUndo;
    try {
      await cancelPrompt.mutateAsync({
        taskId: undo.taskId,
        promptEventId: undo.promptEventId,
      });
      setPendingUndo(null);
      setUndoError(null);
    } catch (error) {
      setUndoError(getKoekakeMutationErrorMessage(error));
    }
  };

  const isTaskCancelPending = (taskId: number) =>
    cancelPrompt.isPending && cancelPrompt.variables?.taskId === taskId;

  const handleDetailSnooze = async (
    taskId: number,
    body: { minutes: 5 | 10 | 15 } | { none_today: true },
  ) => {
    setActionError(null);
    try {
      await snoozeMutation.mutateAsync({ taskId, body });
    } catch (error) {
      setActionError(getKoekakeMutationErrorMessage(error));
    }
  };

  const handleDetailCompletion = async (
    taskId: number,
    status: CompletionStatus,
  ) => {
    setActionError(null);
    try {
      await completionMutation.mutateAsync({
        taskId,
        body: { status },
      });
    } catch (error) {
      setActionError(getKoekakeMutationErrorMessage(error));
    }
  };

  const detailSummary =
    tasksQuery.data?.tasks.find((task) => task.id === detailTask?.id) ??
    detailTask;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
          <MessageCircleHeart aria-hidden="true" size={17} />
          声かけリマインダー
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          声かけリマインダー
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-text)]">
          {tasksQuery.data ? formatDate(tasksQuery.data.date) : formatDate(today)}
        </p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[var(--mother-red)] bg-[var(--mother-red-soft)] px-4 py-3 text-sm text-[var(--mother-red-strong)]"
        >
          {actionError}
        </p>
      )}

      <KoekakePhaseTabs
        tabs={KOEKAKE_PHASE_TABS}
        value={phase}
        onChange={(value) => setPhase(value as KoekakePhase)}
        label="時間帯"
        panelId="koekake-task-list"
      />

      {tasksQuery.isPending && (
        <p role="status" className="text-sm text-[var(--muted-text)]">
          読み込み中…
        </p>
      )}

      {tasksQuery.isError && (
        <DashboardError
          message={
            tasksQuery.error instanceof ApiError
              ? tasksQuery.error.message
              : "声かけの一覧を読み込めませんでした。"
          }
          onRetry={() => void tasksQuery.refetch()}
          isRetrying={tasksQuery.isFetching}
        />
      )}

      {tasksQuery.data && (
        <div
          id="koekake-task-list"
          role="tabpanel"
          aria-labelledby={`koekake-tab-${phase}`}
          className="space-y-4"
        >
          {tasksQuery.data.tasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-text)]">
              この時間帯のタスクはありません。
            </p>
          ) : (
            tasksQuery.data.tasks.map((task) => (
              <KoekakeTaskCard
                key={task.id}
                task={task}
                onPrompt={handleCardPrompt}
                onSnooze={handleCardSnooze}
                onOpenDetail={setDetailTask}
                isPromptPending={
                  createPrompt.isPending &&
                  createPrompt.variables?.daily_task_id === task.id
                }
                isPromptBlocked={isTaskCancelPending(task.id)}
                isSnoozePending={
                  snoozeMutation.isPending &&
                  snoozeMutation.variables?.taskId === task.id
                }
              />
            ))
          )}
        </div>
      )}

      {pendingUndo && (
        <KoekakeUndoToast
          taskName={pendingUndo.taskName}
          onUndo={() => void handleUndo()}
          onRetry={undoError ? () => void handleUndo() : undefined}
          errorMessage={undoError}
          isUndoing={cancelPrompt.isPending}
        />
      )}

      {detailTask && detailSummary && (
        <KoekakeDetailSheet
          taskId={detailTask.id}
          summary={detailSummary}
          detail={detailQuery.data}
          isLoading={detailQuery.isPending}
          onClose={() => setDetailTask(null)}
          onPromptWithText={(task, promptText, source) =>
            void submitPrompt(task, promptText, source)
          }
          onSnooze={(taskId, minutes) => void handleDetailSnooze(taskId, { minutes })}
          onSnoozeNoneToday={(taskId) =>
            void handleDetailSnooze(taskId, { none_today: true })
          }
          onCompletion={(taskId, status) =>
            void handleDetailCompletion(taskId, status)
          }
          pendingPrompt={createPrompt.isPending}
          pendingCancel={isTaskCancelPending(detailTask.id)}
          pendingSnooze={snoozeMutation.isPending}
          pendingCompletion={completionMutation.isPending}
        />
      )}
    </div>
  );
}
