<?php

namespace App\Services\Koekake;

use App\Exceptions\IdempotencyConflictException;
use App\Models\DailyTask;
use App\Models\PromptEvent;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class PromptEventService
{
    public function __construct(
        private readonly KoekakeTaskService $taskService,
    ) {}

    /**
     * @return array{
     *     prompt_event_id: int,
     *     daily_task_id: int,
     *     prompt_count: int,
     *     latest_prompt_at: string|null,
     *     suggested_prompt: array{prompt_template_id: int, level: int, text: string}|null,
     *     status_code: int
     * }
     */
    public function store(
        int $dailyTaskId,
        string $promptText,
        string $source,
        string $idempotencyKey,
    ): array {
        return DB::transaction(function () use ($dailyTaskId, $promptText, $source, $idempotencyKey): array {
            $existing = PromptEvent::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing !== null) {
                if ($existing->daily_task_id !== $dailyTaskId
                  || $existing->prompt_text !== $promptText
                  || $existing->source !== $source) {
                    throw new IdempotencyConflictException('Idempotency key conflict.');
                }

                $task = DailyTask::query()->findOrFail($existing->daily_task_id);

                return $this->buildStoreResponse($existing, $task, 200);
            }

            try {
                $task = DailyTask::query()->lockForUpdate()->findOrFail($dailyTaskId);

                $activeCount = PromptEvent::query()
                    ->where('daily_task_id', $task->id)
                    ->whereNull('cancelled_at')
                    ->count();

                $event = DB::transaction(
                    function () use ($task, $activeCount, $promptText, $source, $idempotencyKey): PromptEvent {
                        return PromptEvent::query()->create([
                            'daily_task_id' => $task->id,
                            'prompted_at' => now('UTC'),
                            'prompt_order' => $activeCount + 1,
                            'prompt_text' => $promptText,
                            'source' => $source,
                            'idempotency_key' => $idempotencyKey,
                        ]);
                    },
                    1,
                );

                $this->recalculatePromptCache($task);

                return $this->buildStoreResponse($event, $task->fresh(), 201);
            } catch (QueryException $exception) {
                if (! $this->isUniqueViolation($exception)) {
                    throw $exception;
                }

                $recovered = PromptEvent::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($recovered === null) {
                    throw $exception;
                }

                if ($recovered->daily_task_id !== $dailyTaskId
                  || $recovered->prompt_text !== $promptText
                  || $recovered->source !== $source) {
                    throw new IdempotencyConflictException('Idempotency key conflict.');
                }

                $task = DailyTask::query()->findOrFail($recovered->daily_task_id);

                return $this->buildStoreResponse($recovered, $task, 200);
            }
        });
    }

    /**
     * @return array{
     *     daily_task_id: int,
     *     prompt_count: int,
     *     latest_prompt_at: string|null
     * }
     */
    public function cancel(int $promptEventId): array
    {
        return DB::transaction(function () use ($promptEventId): array {
            $event = PromptEvent::query()->findOrFail($promptEventId);
            $task = DailyTask::query()->lockForUpdate()->findOrFail($event->daily_task_id);

            $taskDate = CarbonImmutable::parse($task->task_date->toDateString(), JstDate::TIMEZONE)->toDateString();

            if ($taskDate !== JstDate::today()) {
                throw ValidationException::withMessages([
                    'prompt_event' => ['当日の声かけのみ取り消せます。'],
                ]);
            }

            if ($event->cancelled_at === null) {
                $event->update(['cancelled_at' => now('UTC')]);
                $this->recalculatePromptCache($task);
                $task->refresh();
            }

            return [
                'daily_task_id' => $task->id,
                'prompt_count' => $task->prompt_count,
                'latest_prompt_at' => $task->latest_prompt_at !== null
                  ? $this->taskService->formatDateTime($task->latest_prompt_at)
                  : null,
            ];
        });
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());

        return $sqlState === '23505'
            || str_contains($exception->getMessage(), 'UNIQUE constraint failed');
    }

    private function recalculatePromptCache(DailyTask $task): void
    {
        $activeEvents = PromptEvent::query()
            ->where('daily_task_id', $task->id)
            ->whereNull('cancelled_at')
            ->orderByDesc('prompted_at')
            ->get();

        $task->update([
            'prompt_count' => $activeEvents->count(),
            'latest_prompt_at' => $activeEvents->first()?->prompted_at,
        ]);
    }

    /**
     * @return array{
     *     prompt_event_id: int,
     *     daily_task_id: int,
     *     prompt_count: int,
     *     latest_prompt_at: string|null,
     *     suggested_prompt: array{prompt_template_id: int, level: int, text: string}|null,
     *     status_code: int
     * }
     */
    private function buildStoreResponse(PromptEvent $event, DailyTask $task, int $statusCode): array
    {
        return [
            'prompt_event_id' => $event->id,
            'daily_task_id' => $task->id,
            'prompt_count' => $task->prompt_count,
            'latest_prompt_at' => $task->latest_prompt_at !== null
              ? $this->taskService->formatDateTime($task->latest_prompt_at)
              : null,
            'suggested_prompt' => $this->taskService->resolveSuggestedPrompt(
                $task->routine_template_id,
                $task->prompt_count,
            ),
            'status_code' => $statusCode,
        ];
    }
}
