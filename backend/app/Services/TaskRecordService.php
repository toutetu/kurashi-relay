<?php

namespace App\Services;

use App\Exceptions\IdempotencyConflictException;
use App\Models\ActivityEvent;
use App\Models\ActivityEventCancellation;
use App\Models\ActivityEventNote;
use App\Models\FamilyMember;
use App\Models\RewardCollection;
use App\Models\TaskDefinition;
use Carbon\CarbonImmutable;
use Database\Support\ActivityDefinitionCatalog;
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

    public static function activityEventIdempotencyKey(string $clientIdempotencyKey): string
    {
        return "oshigoto:{$clientIdempotencyKey}";
    }

    public static function clientIdempotencyKeyFromEvent(ActivityEvent $event): string
    {
        $key = (string) $event->idempotency_key;

        if (str_starts_with($key, 'oshigoto:')) {
            return substr($key, strlen('oshigoto:'));
        }

        return $key;
    }

    /**
     * きろくタイムラインは activity_events（event_type=activity）を正本とする(DR-036)。
     *
     * @return array{
     *     date: string,
     *     member: string,
     *     records: list<array<string, mixed>>
     * }
     */
    public function listForMember(FamilyMember $member, string $recordDate): array
    {
        $calendarKey = ActivityDefinitionCatalog::calendarActivityDefinitionKey();
        $events = $this->activityEventRecordQuery
            ->activityEventsForActorOnDate($member, $recordDate)
            ->reject(
                fn (ActivityEvent $event): bool => $event->activityDefinition?->activity_key === $calendarKey,
            )
            ->values();

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
     *     record: array<string, mixed>,
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
        ?string $note = null,
    ): array {
        return DB::transaction(function () use ($member, $taskDefinition, $recordDate, $idempotencyKey, $note): array {
            FamilyMember::query()->whereKey($member->id)->lockForUpdate()->first();

            $activityDefinitionId = $taskDefinition->activity_definition_id;
            if ($activityDefinitionId === null) {
                throw ValidationException::withMessages([
                    'task' => ['活動定義が紐づいていないため、実績を保存できません。'],
                ]);
            }

            $eventKey = self::activityEventIdempotencyKey($idempotencyKey);

            $existing = ActivityEvent::query()
                ->with(['note', 'rewardCollection', 'actorMember', 'cancellation'])
                ->where('idempotency_key', $eventKey)
                ->first();

            if ($existing !== null) {
                if (! $this->eventMatchesPayload($existing, $member, $taskDefinition, $recordDate)) {
                    throw new IdempotencyConflictException('Idempotency key conflict.');
                }

                return $this->buildStoreResult(
                    $existing,
                    $taskDefinition,
                    $recordDate,
                    true,
                    200,
                    $existing->rewardCollection,
                );
            }

            try {
                $event = DB::transaction(
                    function () use ($member, $taskDefinition, $activityDefinitionId, $recordDate, $eventKey, $note): ActivityEvent {
                        $occurredAt = CarbonImmutable::parse($recordDate, 'Asia/Tokyo')
                            ->setTimeFrom(CarbonImmutable::now('Asia/Tokyo'))
                            ->utc();

                        $event = ActivityEvent::query()->create([
                            'activity_definition_id' => $activityDefinitionId,
                            'event_type' => 'activity',
                            'occurred_at' => $occurredAt,
                            'ended_at' => null,
                            'recorded_by_member_id' => $member->id,
                            'actor_member_id' => $member->id,
                            'source' => 'oshigoto',
                            'idempotency_key' => $eventKey,
                        ]);

                        if ($note !== null && $note !== '') {
                            ActivityEventNote::query()->create([
                                'activity_event_id' => $event->id,
                                'note' => $note,
                            ]);
                        }

                        return $event;
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

            $event->load(['note', 'actorMember', 'rewardCollection']);

            $this->rewardLedger->recordEarnForOshigotoEvent(
                $event,
                $member->id,
                (int) $taskDefinition->point_value,
                $idempotencyKey,
            );

            $revealedReward = $this->maybeGrantReward($member, $event, $recordDate);

            return $this->buildStoreResult(
                $event,
                $taskDefinition,
                $recordDate,
                false,
                201,
                $revealedReward,
            );
        });
    }

    /**
     * @return array{
     *     record: array<string, mixed>,
     *     summary: array<string, mixed>
     * }
     */
    public function cancel(int $activityEventId): array
    {
        return DB::transaction(function () use ($activityEventId): array {
            $initial = ActivityEvent::query()->findOrFail($activityEventId);

            if ($initial->source !== 'oshigoto' || $initial->event_type !== 'activity') {
                throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)
                    ->setModel(ActivityEvent::class, [$activityEventId]);
            }

            FamilyMember::query()
                ->whereKey($initial->actor_member_id)
                ->lockForUpdate()
                ->firstOrFail();

            $event = ActivityEvent::query()
                ->with(['actorMember', 'note', 'cancellation', 'activityDefinition'])
                ->whereKey($activityEventId)
                ->lockForUpdate()
                ->firstOrFail();

            $cancelledAt = $event->cancellation?->cancelled_at;

            if ($cancelledAt === null) {
                $cancelledAt = now('UTC');
                try {
                    ActivityEventCancellation::query()->create([
                        'activity_event_id' => $event->id,
                        'cancelled_at' => $cancelledAt,
                        'cancelled_by_member_id' => $event->actor_member_id,
                        'created_at' => now('UTC'),
                    ]);
                } catch (QueryException $exception) {
                    if (! $this->isUniqueViolation($exception)) {
                        throw $exception;
                    }
                }
                $event->unsetRelation('cancellation');
                $event->load('cancellation');
                $cancelledAt = $event->cancellation?->cancelled_at ?? $cancelledAt;
            }

            $clientKey = self::clientIdempotencyKeyFromEvent($event);
            $this->rewardLedger->recordReversalForOshigotoEvent($event, $clientKey, $cancelledAt);

            $recordDate = $event->occurred_at->timezone('Asia/Tokyo')->toDateString();
            $taskDefinition = TaskDefinition::query()
                ->where('activity_definition_id', $event->activity_definition_id)
                ->where('owner_role', $event->actorMember->role)
                ->first();

            $summary = $this->rewardCalculator->summary($event->actorMember, $recordDate);

            return [
                'record' => $this->toRecordArray($event, $taskDefinition, $recordDate, $cancelledAt),
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

    private function eventMatchesPayload(
        ActivityEvent $event,
        FamilyMember $member,
        TaskDefinition $taskDefinition,
        string $recordDate,
    ): bool {
        if ($event->actor_member_id !== $member->id) {
            return false;
        }

        if ($event->activity_definition_id !== $taskDefinition->activity_definition_id) {
            return false;
        }

        return $event->occurred_at->timezone('Asia/Tokyo')->toDateString() === $recordDate;
    }

    /**
     * @return array{
     *     record: array<string, mixed>,
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

        $event = ActivityEvent::query()
            ->with(['note', 'rewardCollection', 'actorMember'])
            ->where('idempotency_key', self::activityEventIdempotencyKey($idempotencyKey))
            ->first();

        if ($event === null) {
            throw $exception;
        }

        if (! $this->eventMatchesPayload($event, $member, $taskDefinition, $recordDate)) {
            throw new IdempotencyConflictException('Idempotency key conflict.');
        }

        return $this->buildStoreResult(
            $event,
            $taskDefinition,
            $recordDate,
            true,
            200,
            $event->rewardCollection,
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
     *     record: array<string, mixed>,
     *     summary: array<string, mixed>,
     *     revealed_reward: RewardCollection|null,
     *     deduplicated: bool,
     *     status_code: int
     * }
     */
    private function buildStoreResult(
        ActivityEvent $event,
        TaskDefinition $taskDefinition,
        string $summaryDate,
        bool $deduplicated,
        int $statusCode,
        ?RewardCollection $revealedReward = null,
    ): array {
        $member = $event->actorMember ?? FamilyMember::query()->findOrFail($event->actor_member_id);

        return [
            'record' => $this->toRecordArray($event, $taskDefinition, $summaryDate, null),
            'summary' => $this->rewardCalculator->summary($member, $summaryDate),
            'revealed_reward' => $revealedReward,
            'deduplicated' => $deduplicated,
            'status_code' => $statusCode,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function toRecordArray(
        ActivityEvent $event,
        ?TaskDefinition $taskDefinition,
        string $recordDate,
        mixed $cancelledAt,
    ): array {
        $note = $event->note?->note;
        $trimmedNote = is_string($note) && trim($note) !== '' ? trim($note) : null;
        $title = $trimmedNote
            ?? $taskDefinition?->title
            ?? $event->activityDefinition?->name
            ?? '活動';

        return [
            'id' => $event->id,
            'member' => ($event->actorMember ?? FamilyMember::query()->findOrFail($event->actor_member_id))->role,
            'task' => $taskDefinition?->slug ?? $event->activityDefinition?->activity_key ?? 'activity',
            'task_title' => $title,
            'record_date' => $recordDate,
            'completed_at' => $event->occurred_at->timezone('Asia/Tokyo')->toIso8601String(),
            'cancelled_at' => $cancelledAt !== null
                ? CarbonImmutable::parse($cancelledAt)->timezone('Asia/Tokyo')->toIso8601String()
                : null,
            'note' => $trimmedNote,
        ];
    }

    private function maybeGrantReward(
        FamilyMember $member,
        ActivityEvent $event,
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
            'activity_event_id' => $event->id,
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
