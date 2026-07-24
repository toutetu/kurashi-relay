<?php

namespace App\Services;

use App\Models\ActivityDefinition;
use App\Models\ActivityEvent;
use App\Models\FamilyMember;
use App\Models\TaskDefinition;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class TaskService
{
    public function __construct(
        private readonly RewardCalculator $rewardCalculator,
        private readonly ActivityEventRecordQuery $activityEventRecordQuery,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function listForMember(FamilyMember $member, string $date): array
    {
        $definitions = TaskDefinition::query()
            ->where('owner_role', $member->role)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $activityCounts = $this->activityEventRecordQuery
            ->activityCountsByDefinitionForActorOnDate($member, $date);

        $lastEventIdsByDefinition = $this->latestOshigotoEventIdsByDefinition($member, $date);

        $coveredActivityDefinitionIds = [];

        $tasks = $definitions->map(function (TaskDefinition $definition) use (
            $activityCounts,
            $lastEventIdsByDefinition,
            &$coveredActivityDefinitionIds,
        ): array {
            $activityDefinitionId = $definition->activity_definition_id;
            // 件数の正本は activity_events のみ（DR-050/051）。
            $count = $activityDefinitionId !== null
                ? (int) ($activityCounts[$activityDefinitionId] ?? 0)
                : 0;

            if ($activityDefinitionId !== null) {
                $coveredActivityDefinitionIds[$activityDefinitionId] = true;
            }

            /** @var int|null $lastRecordId 取消用。oshigoto の activity_events.id */
            $lastRecordId = $activityDefinitionId !== null
                ? ($lastEventIdsByDefinition[$activityDefinitionId] ?? null)
                : null;

            return [
                'slug' => $definition->slug,
                'title' => $definition->title,
                'category' => $definition->category,
                'point_value' => $definition->point_value,
                'sort_order' => $definition->sort_order,
                'count' => $count,
                'last_record_id' => $lastRecordId,
                'done' => $count > 0,
                'record_id' => $lastRecordId,
            ];
        })->values()->all();

        $uncoveredIds = [];
        foreach ($activityCounts as $activityDefinitionId => $count) {
            $id = (int) $activityDefinitionId;
            if ($count > 0 && ! isset($coveredActivityDefinitionIds[$id])) {
                $uncoveredIds[] = $id;
            }
        }

        if ($uncoveredIds !== []) {
            $activities = ActivityDefinition::query()
                ->whereIn('id', $uncoveredIds)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->keyBy('id');

            $baseSort = count($tasks) > 0
                ? (int) max(array_column($tasks, 'sort_order')) + 1
                : 1;

            foreach ($uncoveredIds as $index => $activityDefinitionId) {
                /** @var ActivityDefinition|null $activity */
                $activity = $activities->get($activityDefinitionId);
                if ($activity === null) {
                    continue;
                }

                $count = (int) $activityCounts[$activityDefinitionId];
                $tasks[] = [
                    'slug' => $activity->activity_key,
                    'title' => $activity->name,
                    'category' => $activity->category,
                    'point_value' => 0,
                    'sort_order' => $baseSort + $index,
                    'count' => $count,
                    'last_record_id' => null,
                    'done' => true,
                    'record_id' => null,
                ];
            }
        }

        usort(
            $tasks,
            static fn (array $left, array $right): int => $left['sort_order'] <=> $right['sort_order'],
        );

        return [
            'date' => $date,
            'member' => $member->role,
            'tasks' => $tasks,
            'summary' => $this->rewardCalculator->summary($member, $date),
        ];
    }

    /**
     * @return array<int, int> activity_definition_id => latest activity_event id
     */
    private function latestOshigotoEventIdsByDefinition(FamilyMember $member, string $tokyoDate): array
    {
        [$startUtc, $endUtc] = $this->tokyoDayBoundsUtc($tokyoDate);

        /** @var Collection<int, ActivityEvent> $events */
        $events = ActivityEvent::query()
            ->where('event_type', 'activity')
            ->where('source', 'oshigoto')
            ->where('actor_member_id', $member->id)
            ->whereBetween('occurred_at', [$startUtc, $endUtc])
            ->whereDoesntHave('cancellation')
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();

        $latest = [];
        foreach ($events as $event) {
            $definitionId = (int) $event->activity_definition_id;
            if (! isset($latest[$definitionId])) {
                $latest[$definitionId] = (int) $event->id;
            }
        }

        return $latest;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function tokyoDayBoundsUtc(string $tokyoDate): array
    {
        $start = CarbonImmutable::parse($tokyoDate, 'Asia/Tokyo')->startOfDay()->utc();
        $end = CarbonImmutable::parse($tokyoDate, 'Asia/Tokyo')->endOfDay()->utc();

        return [$start, $end];
    }
}
