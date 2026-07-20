<?php

namespace App\Services\Koekake;

use App\Models\ActivityEvent;
use App\Models\ActivityEventParticipant;
use App\Models\CompletionEvent;
use App\Models\DailyTask;
use App\Models\PlanActualLink;
use App\Models\ReminderSchedule;
use App\Support\FamilyMemberResolver;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CompletionService
{
    /** @var list<string> */
    private const ACTIVITY_CREATING_STATUSES = ['completed', 'together', 'parent_done'];

    /** @var list<string> 本人しか実行できない活動 */
    private const SELF_ONLY_ACTIVITY_KEYS = ['ACT-037'];

    public function __construct(
        private readonly KoekakeTaskService $taskService,
    ) {}

    /**
     * @return array{
     *     task_id: int,
     *     status: string,
     *     completion: array{status: string, completed_at: string, note: string|null}
     * }
     */
    public function update(
        int $taskId,
        string $status,
        ?string $note,
        ?CarbonImmutable $occurredAt = null,
        ?CarbonImmutable $endedAt = null,
    ): array {
        return DB::transaction(function () use ($taskId, $status, $note, $occurredAt, $endedAt): array {
            $task = DailyTask::query()
                ->with('routineTemplate')
                ->lockForUpdate()
                ->findOrFail($taskId);

            $this->assertParentDoneAllowed($task, $status);

            $completion = CompletionEvent::query()->updateOrCreate(
                ['daily_task_id' => $task->id],
                [
                    'status' => $status,
                    'completed_at' => now('UTC'),
                    'note' => $note,
                ],
            );

            $task->update(['status' => $status]);

            if (in_array($status, ['completed', 'together', 'parent_done', 'deferred'], true)) {
                ReminderSchedule::query()
                    ->where('daily_task_id', $task->id)
                    ->where('status', 'scheduled')
                    ->update(['status' => 'cancelled']);
            }

            if (in_array($status, self::ACTIVITY_CREATING_STATUSES, true)) {
                $this->ensureActivityEvent($task, $status, $occurredAt, $endedAt);
            }

            return [
                'task_id' => $task->id,
                'status' => $task->status,
                'completion' => [
                    'status' => $completion->status,
                    'completed_at' => $this->taskService->formatDateTime($completion->completed_at),
                    'note' => $completion->note,
                ],
            ];
        });
    }

    private function assertParentDoneAllowed(DailyTask $task, string $status): void
    {
        if ($status !== 'parent_done') {
            return;
        }

        $activityKey = $task->routineTemplate?->activity_key;

        if ($activityKey !== null && in_array($activityKey, self::SELF_ONLY_ACTIVITY_KEYS, true)) {
            throw ValidationException::withMessages([
                'status' => ['この活動は本人しか完了できないため、代行は選べません。'],
            ]);
        }
    }

    private function ensureActivityEvent(
        DailyTask $task,
        string $status,
        ?CarbonImmutable $occurredAt,
        ?CarbonImmutable $endedAt,
    ): void {
        $idempotencyKey = $this->idempotencyKey($task->id);

        $existing = ActivityEvent::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing !== null) {
            $this->ensurePlanActualLink($task, $existing);

            return;
        }

        $activityDefinitionId = $task->routineTemplate?->activity_definition_id;

        if ($activityDefinitionId === null) {
            throw ValidationException::withMessages([
                'status' => ['活動定義が紐づいていないため、実績を保存できません。'],
            ]);
        }

        $motherId = FamilyMemberResolver::motherId();
        $childId = $task->subject_member_id;
        $occurredAtUtc = ($occurredAt ?? CarbonImmutable::now('UTC'))->utc();
        $endedAtUtc = $endedAt?->utc();

        try {
            $event = ActivityEvent::query()->create([
                'activity_definition_id' => $activityDefinitionId,
                'event_type' => 'activity',
                'occurred_at' => $occurredAtUtc,
                'ended_at' => $endedAtUtc,
                'recorded_by_member_id' => $motherId,
                'source' => 'koekake',
                'idempotency_key' => $idempotencyKey,
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }

            $recovered = ActivityEvent::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($recovered === null) {
                throw $exception;
            }

            $this->ensurePlanActualLink($task, $recovered);

            return;
        }

        foreach ($this->participantsForStatus($status, $childId, $motherId) as $participant) {
            ActivityEventParticipant::query()->create([
                'activity_event_id' => $event->id,
                'family_member_id' => $participant['family_member_id'],
                'role' => $participant['role'],
                'created_at' => now('UTC'),
            ]);
        }

        $this->ensurePlanActualLink($task, $event);
    }

    /**
     * @return list<array{family_member_id: int, role: string}>
     */
    private function participantsForStatus(string $status, int $childId, int $motherId): array
    {
        return match ($status) {
            'together' => [
                ['family_member_id' => $childId, 'role' => 'actor'],
                ['family_member_id' => $motherId, 'role' => 'supporter'],
            ],
            'parent_done' => [
                ['family_member_id' => $motherId, 'role' => 'actor'],
                ['family_member_id' => $childId, 'role' => 'target'],
            ],
            default => [
                ['family_member_id' => $childId, 'role' => 'actor'],
            ],
        };
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

    private function idempotencyKey(int $dailyTaskId): string
    {
        return "koekake:daily-task:{$dailyTaskId}:completion";
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());

        return $sqlState === '23505'
            || str_contains($exception->getMessage(), 'UNIQUE constraint failed');
    }
}
