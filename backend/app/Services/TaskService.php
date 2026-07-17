<?php

namespace App\Services;

use App\Models\FamilyMember;
use App\Models\TaskDefinition;
use App\Models\TaskRecord;

final class TaskService
{
    public function __construct(
        private readonly RewardCalculator $rewardCalculator,
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

        $tasks = $definitions->map(function (TaskDefinition $definition) use ($recordsByTaskId): array {
            $taskRecords = $recordsByTaskId->get($definition->id, collect());
            $count = $taskRecords->count();
            /** @var int|null $lastRecordId */
            $lastRecordId = $count > 0 ? (int) $taskRecords->max('id') : null;

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

        return [
            'date' => $date,
            'member' => $member->role,
            'tasks' => $tasks,
            'summary' => $this->rewardCalculator->summary($member, $date),
        ];
    }
}
