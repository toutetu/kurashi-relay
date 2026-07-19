<?php

namespace Database\Seeders;

use App\Models\FamilyMember;
use App\Models\RewardRule;
use App\Models\TaskDefinition;
use Illuminate\Database\Seeder;

class RewardRuleSeeder extends Seeder
{
    public function run(): void
    {
        $motherId = FamilyMember::query()->where('role', 'mother')->valueOrFail('id');

        TaskDefinition::query()
            ->where('owner_role', 'mother')
            ->where('is_active', true)
            ->with('activityDefinition')
            ->get()
            ->each(function (TaskDefinition $task) use ($motherId): void {
                if ($task->activity_definition_id === null) {
                    return;
                }

                RewardRule::query()->updateOrCreate(
                    [
                        'member_id' => $motherId,
                        'activity_definition_id' => $task->activity_definition_id,
                        'reward_kind' => 'point',
                    ],
                    [
                        'amount' => $task->point_value,
                        'valid_from' => null,
                        'valid_until' => null,
                        'is_active' => true,
                    ],
                );
            });
    }
}
