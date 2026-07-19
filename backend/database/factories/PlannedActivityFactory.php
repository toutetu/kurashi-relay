<?php

namespace Database\Factories;

use App\Models\FamilyMember;
use App\Models\PlannedActivity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlannedActivity>
 */
class PlannedActivityFactory extends Factory
{
    protected $model = PlannedActivity::class;

    public function definition(): array
    {
        return [
            'subject_member_id' => FamilyMember::factory(),
            'activity_definition_id' => null,
            'source_type' => 'manual',
            'source_key' => fake()->unique()->uuid(),
            'title_snapshot' => fake()->sentence(3),
            'category_snapshot' => 'today_task',
            'planned_start_at' => null,
            'planned_end_at' => null,
            'is_all_day' => false,
            'local_date' => now('Asia/Tokyo')->toDateString(),
            'status' => 'planned',
            'routine_template_id' => null,
            'plan_answer_version_id' => null,
            'calendar_event_version_id' => null,
        ];
    }
}
