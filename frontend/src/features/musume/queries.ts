import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  completeMusumeReflection,
  getMusumePlan,
  getMusumeSummary,
  replaceMusumeItems,
  updateMusumePlan,
  type CompleteReflectionInput,
  type ReplaceMusumeItemsInput,
  type UpdateMusumePlanInput,
} from "./api/musume";
import type { MusumePlanResponse } from "./api/schemas/musumeSchema";

let planMutationChain: Promise<unknown> = Promise.resolve();

export function resetMusumePlanMutationChainForTests() {
  planMutationChain = Promise.resolve();
}

function enqueuePlanMutation<T>(operation: () => Promise<T>): Promise<T> {
  const next = planMutationChain
    .catch(() => undefined)
    .then(operation)
    .finally(() => {
      if (planMutationChain === next) {
        planMutationChain = Promise.resolve();
      }
    });
  planMutationChain = next;
  return next;
}

export function musumePlanQueryKey(date: string) {
  return ["musume", "plan", date] as const;
}

export function musumeSummaryQueryKey(date: string) {
  return ["musume", "summary", date] as const;
}

function applyPlanResponse(
  queryClient: QueryClient,
  date: string,
  response: MusumePlanResponse,
) {
  queryClient.setQueryData(musumePlanQueryKey(date), response);
}

export function useMusumePlanQuery(date: string) {
  return useQuery({
    queryKey: musumePlanQueryKey(date),
    queryFn: ({ signal }) => getMusumePlan(date, signal),
    staleTime: 30_000,
  });
}

export function useMusumeSummaryQuery(date: string) {
  return useQuery({
    queryKey: musumeSummaryQueryKey(date),
    queryFn: ({ signal }) => getMusumeSummary(date, signal),
    staleTime: 30_000,
  });
}

export function useUpdateMusumePlan(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      body,
    }: {
      planId: number;
      body: UpdateMusumePlanInput;
    }) => enqueuePlanMutation(() => updateMusumePlan(planId, body)),
    onSuccess: (response) => {
      applyPlanResponse(queryClient, date, response);
      void queryClient.invalidateQueries({
        queryKey: musumeSummaryQueryKey(date),
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: musumePlanQueryKey(date) });
    },
  });
}

export function useReplaceMusumeItems(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      body,
    }: {
      planId: number;
      body: ReplaceMusumeItemsInput;
    }) => enqueuePlanMutation(() => replaceMusumeItems(planId, body)),
    onSuccess: (response) => {
      applyPlanResponse(queryClient, date, response);
      void queryClient.invalidateQueries({
        queryKey: musumeSummaryQueryKey(date),
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: musumePlanQueryKey(date) });
    },
  });
}

export function useCompleteMusumeReflection(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      body,
    }: {
      planId: number;
      body: CompleteReflectionInput;
    }) => enqueuePlanMutation(() => completeMusumeReflection(planId, body)),
    onSuccess: (response) => {
      applyPlanResponse(queryClient, date, response);
      void queryClient.invalidateQueries({
        queryKey: musumeSummaryQueryKey(date),
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: musumePlanQueryKey(date) });
    },
  });
}
