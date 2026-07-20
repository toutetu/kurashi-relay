<?php

namespace App\Services;

use App\Models\ActivityDefinition;
use App\Models\FamilyMember;
use App\Models\TaskDefinition;
use App\Models\TaskRecord;

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

        $recordsByTaskId = TaskRecord::query()
            ->where('family_member_id', $member->id)
            ->whereNull('cancelled_at')
            ->whereDate('record_date', $date)
            ->get()
            ->groupBy('task_definition_id');

        $activityCounts = $this->activityEventRecordQuery
            ->activityCountsByDefinitionForActorOnDate($member, $date);

        $coveredActivityDefinitionIds = [];

        $tasks = $definitions->map(function (TaskDefinition $definition) use (
            $recordsByTaskId,
            $activityCounts,
            &$coveredActivityDefinitionIds,
        ): array {
            $taskRecords = $recordsByTaskId->get($definition->id, collect());
            $taskRecordCount = $taskRecords->count();
            $activityDefinitionId = $definition->activity_definition_id;
            $activityCount = $activityDefinitionId !== null
                ? (int) ($activityCounts[$activityDefinitionId] ?? 0)
                : 0;

            if ($activityDefinitionId !== null) {
                $coveredActivityDefinitionIds[$activityDefinitionId] = true;
            }

            $count = $taskRecordCount + $activityCount;
            /** @var int|null $lastRecordId 取消用。activity_events は別経路のため task_records のみ */
            $lastRecordId = $taskRecordCount > 0 ? (int) $taskRecords->max('id') : null;

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
}
