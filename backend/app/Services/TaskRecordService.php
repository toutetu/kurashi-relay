<?php

namespace App\Services;

use App\Exceptions\IdempotencyConflictException;
use App\Models\FamilyMember;
use App\Models\RewardCollection;
use App\Models\TaskDefinition;
use App\Models\TaskRecord;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class TaskRecordService
{
    public function __construct(
        private readonly RewardCalculator $rewardCalculator,
    ) {}

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

            $existingByKey = TaskRecord::query()
                ->with(['familyMember', 'taskDefinition', 'rewardCollection'])
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingByKey !== null) {
                if (! $this->matchesPayload($existingByKey, $member, $taskDefinition, $recordDate)) {
                    throw new IdempotencyConflictException('Idempotency key conflict.');
                }

                return $this->buildStoreResult(
                    $existingByKey,
                    $recordDate,
                    true,
                    200,
                    $existingByKey->rewardCollection,
                );
            }

            $existingActive = TaskRecord::query()
                ->with(['familyMember', 'taskDefinition', 'rewardCollection'])
                ->where('family_member_id', $member->id)
                ->where('task_definition_id', $taskDefinition->id)
                ->whereDate('record_date', $recordDate)
                ->whereNull('cancelled_at')
                ->first();

            if ($existingActive !== null) {
                return $this->buildStoreResult($existingActive, $recordDate, true, 200);
            }

            try {
                $record = DB::transaction(
                    fn (): TaskRecord => TaskRecord::query()->create([
                        'family_member_id' => $member->id,
                        'task_definition_id' => $taskDefinition->id,
                        'record_date' => $recordDate,
                        'completed_at' => now('UTC'),
                        'source' => $source,
                        'idempotency_key' => $idempotencyKey,
                    ]),
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
        $existingByKey = TaskRecord::query()
            ->with(['familyMember', 'taskDefinition', 'rewardCollection'])
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existingByKey !== null) {
            if (! $this->matchesPayload($existingByKey, $member, $taskDefinition, $recordDate)) {
                throw new IdempotencyConflictException('Idempotency key conflict.');
            }

            return $this->buildStoreResult(
                $existingByKey,
                $recordDate,
                true,
                200,
                $existingByKey->rewardCollection,
            );
        }

        $existingActive = TaskRecord::query()
            ->with(['familyMember', 'taskDefinition'])
            ->where('family_member_id', $member->id)
            ->where('task_definition_id', $taskDefinition->id)
            ->whereDate('record_date', $recordDate)
            ->whereNull('cancelled_at')
            ->first();

        if ($existingActive !== null) {
            return $this->buildStoreResult($existingActive, $recordDate, true, 200);
        }

        throw $exception;
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
