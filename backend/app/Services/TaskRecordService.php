<?php

namespace App\Services;

use App\Exceptions\IdempotencyConflictException;
use App\Models\ActivityEvent;
use App\Models\ActivityEventCancellation;
use App\Models\FamilyMember;
use App\Models\RewardCollection;
use App\Models\TaskDefinition;
use App\Models\TaskRecord;
use App\Models\TaskRecordOperation;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class TaskRecordService
{
    public function __construct(
        private readonly RewardCalculator $rewardCalculator,
        private readonly ActivityEventRecordQuery $activityEventRecordQuery,
        private readonly RewardLedgerService $rewardLedger,
    ) {}

    public static function activityEventIdempotencyKey(string $taskRecordIdempotencyKey): string
    {
        return "oshigoto:{$taskRecordIdempotencyKey}";
    }

    /**
     * きろくタイムラインは activity_events（event_type=activity）を正本とする(DR-036)。
     *
     * @return array{
     *     date: string,
     *     member: string,
     *     records: list<array{
     *         id: int,
     *         member: string,
     *         task: string,
     *         task_title: string,
     *         record_date: string,
     *         completed_at: string,
     *         cancelled_at: null
     *     }>
     * }
     */
    public function listForMember(FamilyMember $member, string $recordDate): array
    {
        $events = $this->activityEventRecordQuery
            ->activityEventsForActorOnDate($member, $recordDate);

        return [
            'date' => $recordDate,
            'member' => $member->role,
            'records' => $this->activityEventRecordQuery->toTimelineRecords(
                $member,
                $recordDate,
                $events,
            ),
        ];
    }

    /**
     * @return array{
     *     record: TaskRecord,
     *     summary: array<string, mixed>,
     *     revealed_reward: RewardCollection|null,
     *     deduplicated: bool,
     *     status_code: int
     * }
     */
    public function store(
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        string $recordDate,
        string $idempotencyKey,
        string $source,
    ): array {
        return DB::transaction(function () use ($member, $taskDefinition, $recordDate, $idempotencyKey, $source): array {
            FamilyMember::query()->whereKey($member->id)->lockForUpdate()->first();

            $existingOperation = TaskRecordOperation::query()
                ->with([
                    'taskRecord.familyMember',
                    'taskRecord.taskDefinition',
                    'taskRecord.rewardCollection',
                ])
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingOperation !== null) {
                if (! $this->operationMatchesPayload($existingOperation, $member, $taskDefinition, $recordDate)) {
                    throw new IdempotencyConflictException('Idempotency key conflict.');
                }

                $record = $existingOperation->taskRecord;
                $this->ensureActivityEvent($member, $taskDefinition, $record, $idempotencyKey);

                return $this->buildStoreResult(
                    $record,
                    $recordDate,
                    true,
                    200,
                    $this->revealedRewardForKey($record, $idempotencyKey),
                );
            }

            try {
                $record = DB::transaction(
                    function () use ($member, $taskDefinition, $recordDate, $idempotencyKey, $source): TaskRecord {
                        $record = TaskRecord::query()->create([
                            'family_member_id' => $member->id,
                            'task_definition_id' => $taskDefinition->id,
                            'record_date' => $recordDate,
                            'completed_at' => now('UTC'),
                            'source' => $source,
                            'idempotency_key' => $idempotencyKey,
                            'granted_point_value' => $taskDefinition->point_value,
                        ]);

                        TaskRecordOperation::query()->create([
                            'idempotency_key' => $idempotencyKey,
                            'family_member_id' => $member->id,
                            'task_definition_id' => $taskDefinition->id,
                            'record_date' => $recordDate,
                            'task_record_id' => $record->id,
                        ]);

                        $this->ensureActivityEvent($member, $taskDefinition, $record, $idempotencyKey);

                        return $record;
                    },
                    1,
                );
            } catch (QueryException $exception) {
                return $this->recoverFromInsertConflict(
                    $exception,
                    $member,
                    $taskDefinition,
                    $recordDate,
                    $idempotencyKey,
                );
            }

            $record->load(['familyMember', 'taskDefinition']);

            $this->rewardLedger->recordEarnForTaskRecord($record);

            $revealedReward = $this->maybeGrantReward($member, $record, $recordDate);

            return $this->buildStoreResult($record, $recordDate, false, 201, $revealedReward);
        });
    }

    /**
     * @return array{
     *     record: TaskRecord,
     *     summary: array<string, mixed>
     * }
     */
    public function cancel(int $recordId): array
    {
        return DB::transaction(function () use ($recordId): array {
            $initialRecord = TaskRecord::query()->findOrFail($recordId);

            FamilyMember::query()
                ->whereKey($initialRecord->family_member_id)
                ->lockForUpdate()
                ->firstOrFail();

            $record = TaskRecord::query()
                ->with(['familyMember', 'taskDefinition'])
                ->whereKey($recordId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($record->cancelled_at === null) {
                $record->cancelled_at = now('UTC');
                $record->save();
                $record->refresh()->load(['familyMember', 'taskDefinition']);
            }

            $this->ensureActivityEventCancellation($record);
            $this->rewardLedger->recordReversalForTaskRecord($record);

            $summary = $this->rewardCalculator->summary(
                $record->familyMember,
                $record->record_date->toDateString(),
            );

            return [
                'record' => $record,
                'summary' => $summary,
            ];
        });
    }

    /**
     * @return list<RewardCollection>
     */
    public function collectionsForMember(FamilyMember $member): array
    {
        return RewardCollection::query()
            ->where('family_member_id', $member->id)
            ->orderBy('obtained_on')
            ->orderBy('milestone_number')
            ->get()
            ->all();
    }

    private function ensureActivityEvent(
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        TaskRecord $record,
        string $idempotencyKey,
    ): void {
        $activityDefinitionId = $taskDefinition->activity_definition_id;

        if ($activityDefinitionId === null) {
            throw ValidationException::withMessages([
                'task' => ['活動定義が紐づいていないため、実績を保存できません。'],
            ]);
        }

        $eventKey = self::activityEventIdempotencyKey($idempotencyKey);

        $existing = ActivityEvent::query()
            ->where('idempotency_key', $eventKey)
            ->first();

        if ($existing !== null) {
            return;
        }

        try {
            ActivityEvent::query()->create([
                'activity_definition_id' => $activityDefinitionId,
                'event_type' => 'activity',
                'occurred_at' => $record->completed_at,
                'ended_at' => null,
                'recorded_by_member_id' => $member->id,
                'actor_member_id' => $member->id,
                'source' => 'oshigoto',
                'idempotency_key' => $eventKey,
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }
        }
    }

    private function ensureActivityEventCancellation(TaskRecord $record): void
    {
        $event = ActivityEvent::query()
            ->where('idempotency_key', self::activityEventIdempotencyKey($record->idempotency_key))
            ->first();

        if ($event === null) {
            return;
        }

        if ($event->cancellation()->exists()) {
            return;
        }

        try {
            ActivityEventCancellation::query()->create([
                'activity_event_id' => $event->id,
                'cancelled_at' => $record->cancelled_at ?? now('UTC'),
                'cancelled_by_member_id' => $record->family_member_id,
                'created_at' => now('UTC'),
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }
        }
    }

    private function matchesPayload(
        TaskRecord $record,
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        string $recordDate,
    ): bool {
        return $record->family_member_id === $member->id
            && $record->task_definition_id === $taskDefinition->id
            && $record->record_date->toDateString() === $recordDate;
    }

    private function operationMatchesPayload(
        TaskRecordOperation $operation,
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        string $recordDate,
    ): bool {
        return $operation->family_member_id === $member->id
            && $operation->task_definition_id === $taskDefinition->id
            && $operation->record_date->toDateString() === $recordDate;
    }

    private function registerOperation(
        string $idempotencyKey,
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        string $recordDate,
        TaskRecord $record,
    ): void {
        DB::transaction(
            fn (): TaskRecordOperation => TaskRecordOperation::query()->create([
                'idempotency_key' => $idempotencyKey,
                'family_member_id' => $member->id,
                'task_definition_id' => $taskDefinition->id,
                'record_date' => $recordDate,
                'task_record_id' => $record->id,
            ]),
            1,
        );
    }

    /**
     * The nested transaction around INSERT is a database savepoint. PostgreSQL
     * aborts only that savepoint on a unique violation, so these lookups can
     * safely identify the winning row in the still-usable outer transaction.
     *
     * @return array{
     *     record: TaskRecord,
     *     summary: array<string, mixed>,
     *     revealed_reward: RewardCollection|null,
     *     deduplicated: bool,
     *     status_code: int
     * }
     */
    private function recoverFromInsertConflict(
        QueryException $exception,
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        string $recordDate,
        string $idempotencyKey,
    ): array {
        if (! $this->isUniqueViolation($exception)) {
            throw $exception;
        }

        $existingOperation = TaskRecordOperation::query()
            ->with([
                'taskRecord.familyMember',
                'taskRecord.taskDefinition',
                'taskRecord.rewardCollection',
            ])
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existingOperation !== null) {
            if (! $this->operationMatchesPayload($existingOperation, $member, $taskDefinition, $recordDate)) {
                throw new IdempotencyConflictException('Idempotency key conflict.');
            }

            $record = $existingOperation->taskRecord;
            $this->ensureActivityEvent($member, $taskDefinition, $record, $idempotencyKey);

            return $this->buildStoreResult(
                $record,
                $recordDate,
                true,
                200,
                $this->revealedRewardForKey($record, $idempotencyKey),
            );
        }

        $winner = TaskRecord::query()
            ->with(['familyMember', 'taskDefinition', 'rewardCollection'])
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($winner === null) {
            throw $exception;
        }

        if (! $this->matchesPayload($winner, $member, $taskDefinition, $recordDate)) {
            throw new IdempotencyConflictException('Idempotency key conflict.');
        }

        try {
            $this->registerOperation(
                $idempotencyKey,
                $member,
                $taskDefinition,
                $recordDate,
                $winner,
            );
        } catch (QueryException $operationException) {
            if (! $this->isUniqueViolation($operationException)) {
                throw $operationException;
            }

            $operation = TaskRecordOperation::query()
                ->with([
                    'taskRecord.familyMember',
                    'taskRecord.taskDefinition',
                    'taskRecord.rewardCollection',
                ])
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($operation === null) {
                throw $operationException;
            }

            if (! $this->operationMatchesPayload($operation, $member, $taskDefinition, $recordDate)) {
                throw new IdempotencyConflictException('Idempotency key conflict.');
            }

            $winner = $operation->taskRecord;
        }

        $this->ensureActivityEvent($member, $taskDefinition, $winner, $idempotencyKey);

        return $this->buildStoreResult(
            $winner,
            $recordDate,
            true,
            200,
            $this->revealedRewardForKey($winner, $idempotencyKey),
        );
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());

        return $sqlState === '23505'
            || str_contains($exception->getMessage(), 'UNIQUE constraint failed');
    }

    /**
     * @return array{
     *     record: TaskRecord,
     *     summary: array<string, mixed>,
     *     revealed_reward: RewardCollection|null,
     *     deduplicated: bool,
     *     status_code: int
     * }
     */
    private function buildStoreResult(
        TaskRecord $record,
        string $summaryDate,
        bool $deduplicated,
        int $statusCode,
        ?RewardCollection $revealedReward = null,
    ): array {
        return [
            'record' => $record,
            'summary' => $this->rewardCalculator->summary($record->familyMember, $summaryDate),
            'revealed_reward' => $revealedReward,
            'deduplicated' => $deduplicated,
            'status_code' => $statusCode,
        ];
    }

    private function revealedRewardForKey(
        TaskRecord $record,
        string $idempotencyKey,
    ): ?RewardCollection {
        if ($record->idempotency_key !== $idempotencyKey) {
            return null;
        }

        return $record->rewardCollection;
    }

    private function maybeGrantReward(
        FamilyMember $member,
        TaskRecord $record,
        string $recordDate,
    ): ?RewardCollection {
        $lifetimeCount = $this->rewardCalculator->summary($member, $recordDate)['lifetime_count'];
        $stampSize = (int) config('kurashi.stamp_size', 10);

        if ($lifetimeCount <= 0 || $lifetimeCount % $stampSize !== 0) {
            return null;
        }

        $milestoneNumber = intdiv($lifetimeCount, $stampSize);
        $type = $member->role === 'child' ? 'zombie' : 'sweet';

        $alreadyGranted = RewardCollection::query()
            ->where('family_member_id', $member->id)
            ->where('milestone_number', $milestoneNumber)
            ->exists();

        if ($alreadyGranted) {
            return null;
        }

        return RewardCollection::query()->create([
            'family_member_id' => $member->id,
            'type' => $type,
            'item_slug' => $this->pickRewardItemSlug($type),
            'milestone_number' => $milestoneNumber,
            'obtained_on' => $recordDate,
            'task_record_id' => $record->id,
        ]);
    }

    private function pickRewardItemSlug(string $type): string
    {
        /** @var list<string> $catalog */
        $catalog = config("kurashi.reward_catalog.{$type}", []);

        if ($catalog === []) {
            throw new \RuntimeException("Reward catalog for {$type} is not configured.");
        }

        $index = random_int(0, count($catalog) - 1);

        return $catalog[$index];
    }
}
