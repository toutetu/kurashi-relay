import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  cancelPromptEvent,
  createPromptEvent,
  getKoekakeTask,
  getKoekakeTasks,
  snooze,
  updateCompletion,
  type CreatePromptEventInput,
  type SnoozeInput,
  type UpdateCompletionInput,
} from "../../api/koekake";
import type {
  CancelPromptEventResponse,
  CreatePromptEventResponse,
  KoekakePhase,
  KoekakeTaskDetail,
  KoekakeTaskSummary,
  SnoozeResponse,
  UpdateCompletionResponse,
} from "../../api/schemas/koekakeSchema";

const taskMutationChains = new Map<number, Promise<unknown>>();

function enqueueTaskMutation<T>(
  taskId: number,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = taskMutationChains.get(taskId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(operation)
    .finally(() => {
      if (taskMutationChains.get(taskId) === next) {
        taskMutationChains.delete(taskId);
      }
    });
  taskMutationChains.set(taskId, next);
  return next;
}

export function koekakeTasksQueryKey(date: string, phase: KoekakePhase) {
  return ["koekake", "tasks", date, phase] as const;
}

export function koekakeTaskQueryKey(id: number) {
  return ["koekake", "task", id] as const;
}

function updateTaskInListCache(
  queryClient: QueryClient,
  date: string,
  phase: KoekakePhase,
  taskId: number,
  updater: (task: KoekakeTaskSummary) => KoekakeTaskSummary,
) {
  queryClient.setQueryData(
    koekakeTasksQueryKey(date, phase),
    (current: { date: string; tasks: KoekakeTaskSummary[] } | undefined) => {
      if (!current) return current;
      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId ? updater(task) : task,
        ),
      };
    },
  );
}

function applyPromptEventResponse(
  queryClient: QueryClient,
  date: string,
  phase: KoekakePhase,
  response: CreatePromptEventResponse | CancelPromptEventResponse,
) {
  updateTaskInListCache(
    queryClient,
    date,
    phase,
    response.daily_task_id,
    (task) => ({
      ...task,
      prompt_count: response.prompt_count,
      latest_prompt_at: response.latest_prompt_at,
      ...("suggested_prompt" in response
        ? { suggested_prompt: response.suggested_prompt }
        : {}),
    }),
  );
}

function applySnoozeResponse(
  queryClient: QueryClient,
  date: string,
  phase: KoekakePhase,
  response: SnoozeResponse,
) {
  updateTaskInListCache(
    queryClient,
    date,
    phase,
    response.task_id,
    (task) => ({
      ...task,
      next_remind_at: response.next_remind_at,
    }),
  );
}

function applyCompletionResponse(
  queryClient: QueryClient,
  date: string,
  phase: KoekakePhase,
  response: UpdateCompletionResponse,
) {
  updateTaskInListCache(
    queryClient,
    date,
    phase,
    response.task_id,
    (task) => ({
      ...task,
      status: response.status,
      completion: response.completion,
      next_remind_at:
        response.status === "completed" ||
        response.status === "together" ||
        response.status === "parent_done" ||
        response.status === "deferred"
          ? null
          : task.next_remind_at,
    }),
  );

  queryClient.setQueryData(
    koekakeTaskQueryKey(response.task_id),
    (current: KoekakeTaskDetail | undefined) => {
      if (!current) return current;
      return {
        ...current,
        status: response.status,
        completion: response.completion,
        next_remind_at:
          response.status === "completed" ||
          response.status === "together" ||
          response.status === "parent_done" ||
          response.status === "deferred"
            ? null
            : current.next_remind_at,
      };
    },
  );
}

export function useKoekakeTasksQuery(date: string, phase: KoekakePhase) {
  return useQuery({
    queryKey: koekakeTasksQueryKey(date, phase),
    queryFn: ({ signal }) => getKoekakeTasks(date, phase, signal),
    staleTime: 30_000,
  });
}

export function useKoekakeTaskQuery(id: number | null) {
  return useQuery({
    queryKey: koekakeTaskQueryKey(id ?? 0),
    queryFn: ({ signal }) => {
      if (id === null) throw new Error("task id is required");
      return getKoekakeTask(id, signal);
    },
    enabled: id !== null,
    staleTime: 10_000,
  });
}

export function useCreatePromptEvent(date: string, phase: KoekakePhase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePromptEventInput) =>
      enqueueTaskMutation(input.daily_task_id, () => createPromptEvent(input)),
    onSuccess: (response) => {
      applyPromptEventResponse(queryClient, date, phase, response);
    },
  });
}

export function useCancelPromptEvent(date: string, phase: KoekakePhase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promptEventId: number) => cancelPromptEvent(promptEventId),
    onSuccess: (response) => {
      applyPromptEventResponse(queryClient, date, phase, response);
    },
  });
}

export function useUpdateCompletion(date: string, phase: KoekakePhase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      body,
    }: {
      taskId: number;
      body: UpdateCompletionInput;
    }) => updateCompletion(taskId, body),
    onSuccess: (response) => {
      applyCompletionResponse(queryClient, date, phase, response);
    },
  });
}

export function useSnooze(date: string, phase: KoekakePhase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: SnoozeInput }) =>
      snooze(taskId, body),
    onSuccess: (response) => {
      applySnoozeResponse(queryClient, date, phase, response);
    },
  });
}
