import { MessageCircleHeart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import type {
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
  const [phase, setPhase] = useState<KoekakePhase>(() => getInitialKoekakePhase());
  const [detailTask, setDetailTask] = useState<KoekakeTaskSummary | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
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
    undoTimerRef.current = setTimeout(() => {
      setPendingUndo(null);
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  };

  const submitPrompt = async (
    task: KoekakeTaskSummary,
    promptText: string,
    source: PromptSource,
  ) => {
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
    } catch {
      /* mutation error surfaces via isError if needed */
    }
  };

  const handleCardPrompt = (task: KoekakeTaskSummary) => {
    const payload = buildDefaultPromptPayload(task);
    void submitPrompt(task, payload.prompt_text, payload.source);
  };

  const handleCardSnooze = (task: KoekakeTaskSummary) => {
    void snoozeMutation.mutateAsync({
      taskId: task.id,
      body: { minutes: 5 },
    });
  };

  const handleUndo = () => {
    if (!pendingUndo) return;
    clearUndoTimer();
    const { promptEventId } = pendingUndo;
    setPendingUndo(null);
    void cancelPrompt.mutateAsync(promptEventId);
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
        <KoekakeUndoToast taskName={pendingUndo.taskName} onUndo={handleUndo} />
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
          onSnooze={(taskId, minutes) =>
            void snoozeMutation.mutateAsync({ taskId, body: { minutes } })
          }
          onSnoozeNoneToday={(taskId) =>
            void snoozeMutation.mutateAsync({
              taskId,
              body: { none_today: true },
            })
          }
          onCompletion={(taskId, status) =>
            void completionMutation.mutateAsync({
              taskId,
              body: { status },
            })
          }
          pendingPrompt={createPrompt.isPending}
          pendingSnooze={snoozeMutation.isPending}
          pendingCompletion={completionMutation.isPending}
        />
      )}
    </div>
  );
}
