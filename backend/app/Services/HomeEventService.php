<?php

namespace App\Services;

use App\Models\ActivityDefinition;
use App\Models\ActivityEvent;
use App\Models\ActivityEventCancellation;
use App\Models\DailyCondition;
use App\Models\PlanActualLink;
use App\Models\PlannedActivity;
use App\Support\FamilyMemberResolver;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Database\Support\ActivityDefinitionCatalog;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final class HomeEventService
{
    /**
     * @param  array{
     *   activity_definition_id?: int|null,
     *   planned_activity_id?: int|null,
     *   idempotency_key: string,
     *   occurred_at?: string|null,
     *   ended_at?: string|null,
     *   note?: string|null,
     *   event_type?: string|null
     * }  $input
     * @return array{event: ActivityEvent, created: bool}
     */
    public function store(array $input): array
    {
        $motherId = FamilyMemberResolver::motherId();
        $plan = $this->resolvePlan($input['planned_activity_id'] ?? null, $motherId);
        $definition = $this->resolveDefinition($input['activity_definition_id'] ?? null, $plan);
        $eventType = $input['event_type'] ?? 'activity';
        if (! in_array($eventType, ['activity', 'support'], true)) {
            $eventType = 'activity';
        }

        $occurredAt = isset($input['occurred_at']) && is_string($input['occurred_at']) && $input['occurred_at'] !== ''
            ? CarbonImmutable::parse($input['occurred_at'])->timezone('UTC')
            : CarbonImmutable::now('UTC');
        $endedAt = isset($input['ended_at']) && is_string($input['ended_at']) && $input['ended_at'] !== ''
            ? CarbonImmutable::parse($input['ended_at'])->timezone('UTC')
            : null;

        return DB::transaction(function () use ($definition, $plan, $motherId, $eventType, $occurredAt, $endedAt, $input): array {
            $isDurationActivity = in_array($definition->activity_key, $this->durationActivityKeys(), true);
            if ($isDurationActivity) {
                DB::table('family_members')
                    ->where('id', $motherId)
                    ->lockForUpdate()
                    ->first();
            }

            $existing = ActivityEvent::query()
                ->with('planActualLinks')
                ->where('idempotency_key', $input['idempotency_key'])
                ->first();

            if ($existing !== null) {
                $this->assertIdempotentRequestMatches($existing, $definition, $plan);

                return [
                    'event' => $existing->load(['activityDefinition', 'planActualLinks.plannedActivity']),
                    'created' => false,
                ];
            }

            if ($isDurationActivity) {
                $this->completeRunningActivities($motherId, $occurredAt);
            }

            // 声かけなど瞬間記録は開始=終了で保存する
            if ($endedAt === null && ! $isDurationActivity) {
                $endedAt = $occurredAt;
            }

            $event = ActivityEvent::query()->create([
                'activity_definition_id' => $definition->id,
                'event_type' => $eventType,
                'occurred_at' => $occurredAt,
                'ended_at' => $endedAt,
                'recorded_by_member_id' => $motherId,
                'actor_member_id' => $motherId,
                'source' => 'mother_quick',
                'idempotency_key' => $input['idempotency_key'],
            ]);

            $this->ensurePlanActualLink($event, $plan);

            return [
                'event' => $event->load(['activityDefinition', 'planActualLinks.plannedActivity']),
                'created' => true,
            ];
        });
    }

    public function complete(int $id, string $endedAt): ActivityEvent
    {
        return DB::transaction(function () use ($id, $endedAt): ActivityEvent {
            $definitionIds = ActivityDefinition::query()
                ->whereIn('activity_key', $this->durationActivityKeys())
                ->pluck('id');

            $event = ActivityEvent::query()
                ->where('source', 'mother_quick')
                ->where('recorded_by_member_id', FamilyMemberResolver::motherId())
                ->whereIn('activity_definition_id', $definitionIds)
                ->whereKey($id)
                ->whereDoesntHave('cancellation')
                ->lockForUpdate()
                ->first();

            if ($event === null) {
                throw (new ModelNotFoundException)->setModel(ActivityEvent::class, [$id]);
            }

            if ($event->ended_at !== null) {
                return $event->load(['activityDefinition', 'planActualLinks.plannedActivity']);
            }

            $resolvedEnd = CarbonImmutable::parse($endedAt)->timezone('UTC');
            if ($resolvedEnd->isBefore($event->occurred_at)) {
                throw ValidationException::withMessages([
                    'ended_at' => ['終了時刻は開始時刻以降にしてください。'],
                ]);
            }

            $event->ended_at = $resolvedEnd;
            $event->save();

            return $event->load(['activityDefinition', 'planActualLinks.plannedActivity']);
        });
    }

    public function runningActivity(): ?ActivityEvent
    {
        $definitionIds = ActivityDefinition::query()
            ->whereIn('activity_key', $this->durationActivityKeys())
            ->pluck('id');

        return ActivityEvent::query()
            ->with(['activityDefinition', 'planActualLinks.plannedActivity'])
            ->where('source', 'mother_quick')
            ->where('recorded_by_member_id', FamilyMemberResolver::motherId())
            ->whereIn('activity_definition_id', $definitionIds)
            ->whereNull('ended_at')
            ->whereDoesntHave('cancellation')
            ->latest('occurred_at')
            ->first();
    }

    public function cancel(int $id): ActivityEvent
    {
        return DB::transaction(function () use ($id): ActivityEvent {
            $event = ActivityEvent::query()
                ->whereIn('source', ['mother_quick', 'koekake'])
                ->where('recorded_by_member_id', FamilyMemberResolver::motherId())
                ->whereKey($id)
                ->lockForUpdate()
                ->first();

            if ($event === null) {
                throw (new ModelNotFoundException)->setModel(ActivityEvent::class, [$id]);
            }

            $exists = ActivityEventCancellation::query()
                ->where('activity_event_id', $event->id)
                ->exists();

            if (! $exists) {
                ActivityEventCancellation::query()->create([
                    'activity_event_id' => $event->id,
                    'cancelled_at' => now('UTC'),
                    'cancelled_by_member_id' => FamilyMemberResolver::motherId(),
                    'created_at' => now('UTC'),
                ]);
            }

            return $event->load(['activityDefinition', 'cancellation']);
        });
    }

    /**
     * @param  array{occurred_at?: string|null, ended_at?: string|null}  $input
     */
    public function update(int $id, array $input): ActivityEvent
    {
        return DB::transaction(function () use ($id, $input): ActivityEvent {
            $event = ActivityEvent::query()
                ->whereIn('source', ['mother_quick', 'koekake'])
                ->where('recorded_by_member_id', FamilyMemberResolver::motherId())
                ->whereKey($id)
                ->whereDoesntHave('cancellation')
                ->lockForUpdate()
                ->first();

            if ($event === null) {
                throw (new ModelNotFoundException)->setModel(ActivityEvent::class, [$id]);
            }

            $occurredAt = array_key_exists('occurred_at', $input) && is_string($input['occurred_at']) && $input['occurred_at'] !== ''
                ? CarbonImmutable::parse($input['occurred_at'])->timezone('UTC')
                : $event->occurred_at;

            $endedAt = array_key_exists('ended_at', $input)
                ? (
                    is_string($input['ended_at']) && $input['ended_at'] !== ''
                        ? CarbonImmutable::parse($input['ended_at'])->timezone('UTC')
                        : null
                )
                : $event->ended_at;

            if ($endedAt !== null && $endedAt->isBefore($occurredAt)) {
                throw ValidationException::withMessages([
                    'ended_at' => ['終了時刻は開始時刻以降にしてください。'],
                ]);
            }

            $event->occurred_at = $occurredAt;
            $event->ended_at = $endedAt;
            $event->save();

            return $event->load(['activityDefinition', 'planActualLinks.plannedActivity']);
        });
    }

    public function skipPlan(int $plannedActivityId): PlannedActivity
    {
        $plan = PlannedActivity::query()
            ->whereKey($plannedActivityId)
            ->where('subject_member_id', FamilyMemberResolver::motherId())
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($plan === null) {
            throw (new ModelNotFoundException)->setModel(PlannedActivity::class, [$plannedActivityId]);
        }

        $plan->status = 'cancelled';
        $plan->save();

        return $plan->load(['activityDefinition', 'subjectMember']);
    }

    /**
     * @return list<array{type: string, label: string, count: int, activity_definition_id: int|null}>
     */
    public function quickLogCounts(string $date): array
    {
        $defs = ActivityDefinition::query()
            ->where('is_active', true)
            ->whereIn('quick_label', [
                '起床の声かけ',
                '着替えの声かけ',
                '腹痛対応',
                '自転車で送迎',
                '引き渡し完了',
                '学校へ連絡',
            ])
            ->orWhereIn('activity_key', ['ACT-037', 'ACT-003', 'ACT-041'])
            ->get()
            ->unique('id');

        $start = CarbonImmutable::parse($date, 'Asia/Tokyo')->startOfDay()->timezone('UTC');
        $end = CarbonImmutable::parse($date, 'Asia/Tokyo')->endOfDay()->timezone('UTC');

        $counts = ActivityEvent::query()
            ->where('source', 'mother_quick')
            ->whereBetween('occurred_at', [$start, $end])
            ->whereDoesntHave('cancellation')
            ->selectRaw('activity_definition_id, count(*) as aggregate')
            ->groupBy('activity_definition_id')
            ->pluck('aggregate', 'activity_definition_id');

        $map = [
            'ACT-037' => ['type' => 'wake_prompt', 'label' => '起床の声かけ'],
            'ACT-003' => ['type' => 'change_clothes_prompt', 'label' => '着替えの声かけ'],
            'ACT-041' => ['type' => 'transport', 'label' => '出発・送迎'],
        ];

        $result = [];
        foreach ($map as $key => $meta) {
            $def = $defs->firstWhere('activity_key', $key);
            $id = $def?->id;
            $result[] = [
                'type' => $meta['type'],
                'label' => $meta['label'],
                'count' => $id ? (int) ($counts[$id] ?? 0) : 0,
                'activity_definition_id' => $id,
            ];
        }

        return $result;
    }

    /**
     * @param  array{
     *   local_date?: string,
     *   mother_physical?: int|null,
     *   mother_mood?: int|null,
     *   mother_source?: string|null,
     *   daughter_physical?: int|null,
     *   daughter_mood?: int|null,
     *   daughter_source?: string|null
     * }  $input
     */
    public function upsertConditions(array $input): DailyCondition
    {
        $date = $input['local_date'] ?? JstDate::today();

        $motherSource = $input['mother_source'] ?? null;
        $daughterSource = $input['daughter_source'] ?? null;
        foreach ([$motherSource, $daughterSource] as $source) {
            if ($source !== null && ! in_array($source, ['self', 'guardian_confirmed', 'guardian_observation', 'mother_assumption'], true)) {
                throw ValidationException::withMessages([
                    'source' => ['情報源の指定が正しくありません。'],
                ]);
            }
        }

        return DailyCondition::query()->updateOrCreate(
            ['local_date' => $date],
            [
                'mother_physical' => $input['mother_physical'] ?? null,
                'mother_mood' => $input['mother_mood'] ?? null,
                'mother_source' => $motherSource,
                'daughter_physical' => $input['daughter_physical'] ?? null,
                'daughter_mood' => $input['daughter_mood'] ?? null,
                'daughter_source' => $daughterSource,
                'recorded_by_member_id' => FamilyMemberResolver::motherId(),
            ],
        );
    }

    public function conditionsForDate(string $date): ?DailyCondition
    {
        return DailyCondition::query()->whereDate('local_date', $date)->first();
    }

    private function resolvePlan(mixed $id, int $motherId): ?PlannedActivity
    {
        if ($id === null || $id === '') {
            return null;
        }

        $plan = PlannedActivity::query()
            ->with('activityDefinition')
            ->whereKey((int) $id)
            ->where('subject_member_id', $motherId)
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($plan === null) {
            throw ValidationException::withMessages([
                'planned_activity_id' => ['記録できる「私」の予定を選んでください。'],
            ]);
        }

        return $plan;
    }

    private function resolveDefinition(mixed $id, ?PlannedActivity $plan): ActivityDefinition
    {
        if ($plan?->activityDefinition !== null) {
            return $plan->activityDefinition;
        }

        $query = ActivityDefinition::query()->where('is_active', true);
        if ($id !== null && $id !== '') {
            $query->whereKey((int) $id);
        } elseif ($plan !== null) {
            $query->where('activity_key', ActivityDefinitionCatalog::calendarActivityDefinitionKey());
        } else {
            throw ValidationException::withMessages([
                'activity_definition_id' => ['記録する活動を選んでください。'],
            ]);
        }

        $definition = $query->first();
        if ($definition === null) {
            throw (new ModelNotFoundException)->setModel(ActivityDefinition::class, [$id]);
        }

        return $definition;
    }

    private function ensurePlanActualLink(ActivityEvent $event, ?PlannedActivity $plan): void
    {
        if ($plan === null) {
            return;
        }

        PlanActualLink::query()->firstOrCreate(
            [
                'planned_activity_id' => $plan->id,
                'activity_event_id' => $event->id,
                'link_type' => 'primary',
            ],
            [
                'matched_by' => 'manual',
                'confidence' => 100,
                'created_at' => now('UTC'),
            ],
        );
    }

    private function assertIdempotentRequestMatches(
        ActivityEvent $event,
        ActivityDefinition $definition,
        ?PlannedActivity $plan,
    ): void {
        $linkedPlanIds = $event->planActualLinks
            ->where('link_type', 'primary')
            ->pluck('planned_activity_id')
            ->values();
        $requestedPlanId = $plan?->id;
        $samePlan = $requestedPlanId === null
            ? $linkedPlanIds->isEmpty()
            : $linkedPlanIds->count() === 1 && $linkedPlanIds->first() === $requestedPlanId;

        if ($event->activity_definition_id !== $definition->id || ! $samePlan) {
            throw new ConflictHttpException('同じ再送防止キーに異なる記録内容は指定できません。');
        }
    }

    private function completeRunningActivities(int $motherId, CarbonImmutable $endedAt): void
    {
        $definitionIds = ActivityDefinition::query()
            ->whereIn('activity_key', $this->durationActivityKeys())
            ->pluck('id');

        $events = ActivityEvent::query()
            ->where('source', 'mother_quick')
            ->where('recorded_by_member_id', $motherId)
            ->whereIn('activity_definition_id', $definitionIds)
            ->whereNull('ended_at')
            ->whereDoesntHave('cancellation')
            ->lockForUpdate()
            ->get();

        foreach ($events as $event) {
            $event->ended_at = $endedAt->isBefore($event->occurred_at)
                ? $event->occurred_at
                : $endedAt;
            $event->save();
        }
    }

    /**
     * @return list<string>
     */
    private function durationActivityKeys(): array
    {
        return [
            ...array_values(ActivityDefinitionCatalog::quickActivityDefinitionKeys()),
            ActivityDefinitionCatalog::calendarActivityDefinitionKey(),
        ];
    }
}
