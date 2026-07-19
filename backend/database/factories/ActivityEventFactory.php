<?php

namespace Database\Factories;

use App\Models\ActivityDefinition;
use App\Models\ActivityEvent;
use App\Models\FamilyMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityEvent>
 */
class ActivityEventFactory extends Factory
{
    protected $model = ActivityEvent::class;

    public function definition(): array
    {
        return [
            'activity_definition_id' => ActivityDefinition::factory(),
            'event_type' => 'activity',
            'occurred_at' => now('UTC'),
            'recorded_by_member_id' => FamilyMember::factory(),
            'source' => 'manual',
            'idempotency_key' => fake()->unique()->uuid(),
        ];
    }
}
