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
            ->keyBy('task_definition_id');

        $tasks = $definitions->map(function (TaskDefinition $definition) use ($recordsByTaskId): array {
            /** @var TaskRecord|null $record */
            $record = $recordsByTaskId->get($definition->id);

            return [
                'slug' => $definition->slug,
                'title' => $definition->title,
                'category' => $definition->category,
                'point_value' => $definition->point_value,
                'sort_order' => $definition->sort_order,
                'done' => $record !== null,
                'record_id' => $record?->id,
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
