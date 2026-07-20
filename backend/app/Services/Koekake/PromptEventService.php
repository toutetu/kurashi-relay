<?php

namespace App\Services\Koekake;

use App\Exceptions\IdempotencyConflictException;
use App\Models\ActivityEvent;
use App\Models\ActivityEventCancellation;
use App\Models\ActivityEventParticipant;
use App\Models\DailyTask;
use App\Models\PlanActualLink;
use App\Models\PromptEvent;
use App\Support\FamilyMemberResolver;
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

    public static function activityEventIdempotencyKey(string $promptIdempotencyKey): string
    {
        return "koekake-prompt:{$promptIdempotencyKey}";
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

                $task = DailyTask::query()
                    ->with('routineTemplate')
                    ->findOrFail($existing->daily_task_id);
                $this->ensureActivityEventLinked($existing, $task, $idempotencyKey);

                return $this->buildStoreResponse($existing->fresh(), $task->fresh(), 200);
            }

            try {
                $task = DailyTask::query()
                    ->with('routineTemplate')
                    ->lockForUpdate()
                    ->findOrFail($dailyTaskId);

                $activeCount = PromptEvent::query()
                    ->where('daily_task_id', $task->id)
                    ->whereNull('cancelled_at')
                    ->count();

                $event = DB::transaction(
                    function () use ($task, $activeCount, $promptText, $source, $idempotencyKey): PromptEvent {
                        $activityEvent = $this->createActivityEvent($task, $idempotencyKey);

                        $promptEvent = PromptEvent::query()->create([
                            'activity_event_id' => $activityEvent->id,
                            'daily_task_id' => $task->id,
                            'prompted_at' => $activityEvent->occurred_at,
                            'prompt_order' => $activeCount + 1,
                            'prompt_text' => $promptText,
                            'source' => $source,
                            'idempotency_key' => $idempotencyKey,
                        ]);

                        $this->ensurePlanActualLink($task, $activityEvent);

                        return $promptEvent;
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

                $task = DailyTask::query()
                    ->with('routineTemplate')
                    ->findOrFail($recovered->daily_task_id);
                $this->ensureActivityEventLinked($recovered, $task, $idempotencyKey);

                return $this->buildStoreResponse($recovered->fresh(), $task->fresh(), 200);
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
                $this->ensureActivityEventCancellation($event);
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

    private function createActivityEvent(DailyTask $task, string $idempotencyKey): ActivityEvent
    {
        $eventKey = self::activityEventIdempotencyKey($idempotencyKey);

        $existing = ActivityEvent::query()
            ->where('idempotency_key', $eventKey)
            ->first();

        if ($existing !== null) {
            $this->ensurePromptParticipants($existing, $task);

            return $existing;
        }

        $activityDefinitionId = $task->routineTemplate?->activity_definition_id;

        if ($activityDefinitionId === null) {
            throw ValidationException::withMessages([
                'daily_task_id' => ['活動定義が紐づいていないため、声かけを保存できません。'],
            ]);
        }

        $motherId = FamilyMemberResolver::motherId();
        $childId = $task->subject_member_id;
        $occurredAt = now('UTC');

        try {
            $event = ActivityEvent::query()->create([
                'activity_definition_id' => $activityDefinitionId,
                'event_type' => 'prompt',
                'occurred_at' => $occurredAt,
                'ended_at' => null,
                'recorded_by_member_id' => $motherId,
                'source' => 'koekake',
                'idempotency_key' => $eventKey,
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }

            $recovered = ActivityEvent::query()
                ->where('idempotency_key', $eventKey)
                ->first();

            if ($recovered === null) {
                throw $exception;
            }

            $this->ensurePromptParticipants($recovered, $task);

            return $recovered;
        }

        $this->ensurePromptParticipants($event, $task, $motherId, $childId);

        return $event;
    }

    private function ensureActivityEventLinked(
        PromptEvent $promptEvent,
        DailyTask $task,
        string $idempotencyKey,
    ): void {
        if ($promptEvent->activity_event_id !== null) {
            $activityEvent = ActivityEvent::query()->find($promptEvent->activity_event_id);
            if ($activityEvent !== null) {
                $this->ensurePromptParticipants($activityEvent, $task);
                $this->ensurePlanActualLink($task, $activityEvent);
            }

            return;
        }

        $activityEvent = $this->createActivityEvent($task, $idempotencyKey);

        try {
            $promptEvent->update(['activity_event_id' => $activityEvent->id]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }
        }

        $this->ensurePlanActualLink($task, $activityEvent);
    }

    private function ensurePromptParticipants(
        ActivityEvent $event,
        DailyTask $task,
        ?int $motherId = null,
        ?int $childId = null,
    ): void {
        $motherId ??= FamilyMemberResolver::motherId();
        $childId ??= $task->subject_member_id;

        $this->ensureParticipant($event->id, $motherId, 'actor');
        $this->ensureParticipant($event->id, $childId, 'target');
    }

    private function ensureParticipant(int $activityEventId, int $memberId, string $role): void
    {
        $exists = ActivityEventParticipant::query()
            ->where('activity_event_id', $activityEventId)
            ->where('family_member_id', $memberId)
            ->where('role', $role)
            ->exists();

        if ($exists) {
            return;
        }

        try {
            ActivityEventParticipant::query()->create([
                'activity_event_id' => $activityEventId,
                'family_member_id' => $memberId,
                'role' => $role,
                'created_at' => now('UTC'),
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }
        }
    }

    private function ensurePlanActualLink(DailyTask $task, ActivityEvent $event): void
    {
        if ($task->planned_activity_id === null) {
            return;
        }

        $exists = PlanActualLink::query()
            ->where('planned_activity_id', $task->planned_activity_id)
            ->where('activity_event_id', $event->id)
            ->where('link_type', 'primary')
            ->exists();

        if ($exists) {
            return;
        }

        try {
            PlanActualLink::query()->create([
                'planned_activity_id' => $task->planned_activity_id,
                'activity_event_id' => $event->id,
                'link_type' => 'primary',
                'matched_by' => 'automatic',
                'confidence' => 100,
                'created_at' => now('UTC'),
                'updated_at' => now('UTC'),
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }
        }
    }

    private function ensureActivityEventCancellation(PromptEvent $promptEvent): void
    {
        $activityEventId = $promptEvent->activity_event_id;

        if ($activityEventId === null) {
            $activityEvent = ActivityEvent::query()
                ->where('idempotency_key', self::activityEventIdempotencyKey($promptEvent->idempotency_key))
                ->first();
            $activityEventId = $activityEvent?->id;
        }

        if ($activityEventId === null) {
            return;
        }

        $exists = ActivityEventCancellation::query()
            ->where('activity_event_id', $activityEventId)
            ->exists();

        if ($exists) {
            return;
        }

        try {
            ActivityEventCancellation::query()->create([
                'activity_event_id' => $activityEventId,
                'cancelled_at' => $promptEvent->cancelled_at ?? now('UTC'),
                'cancelled_by_member_id' => FamilyMemberResolver::motherId(),
                'created_at' => now('UTC'),
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }
        }
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
