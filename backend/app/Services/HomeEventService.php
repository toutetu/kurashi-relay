<?php

namespace App\Services;

use App\Models\ActivityDefinition;
use App\Models\ActivityEvent;
use App\Models\ActivityEventCancellation;
use App\Models\DailyCondition;
use App\Support\FamilyMemberResolver;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class HomeEventService
{
    /**
     * @param  array{
     *   activity_definition_id: int,
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
        $definition = ActivityDefinition::query()
            ->whereKey($input['activity_definition_id'])
            ->where('is_active', true)
            ->first();

        if ($definition === null) {
            throw (new ModelNotFoundException)->setModel(ActivityDefinition::class, [$input['activity_definition_id']]);
        }

        $motherId = FamilyMemberResolver::motherId();
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

        return DB::transaction(function () use ($definition, $motherId, $eventType, $occurredAt, $endedAt, $input): array {
            $existing = ActivityEvent::query()
                ->where('idempotency_key', $input['idempotency_key'])
                ->first();

            if ($existing !== null) {
                return ['event' => $existing->load(['activityDefinition']), 'created' => false];
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

            return ['event' => $event->load(['activityDefinition']), 'created' => true];
        });
    }

    public function cancel(int $id): ActivityEvent
    {
        return DB::transaction(function () use ($id): ActivityEvent {
            $event = ActivityEvent::query()
                ->where('source', 'mother_quick')
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
}
