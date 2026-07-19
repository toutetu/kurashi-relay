<?php

namespace Database\Factories;

use App\Models\ActivityDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityDefinition>
 */
class ActivityDefinitionFactory extends Factory
{
    protected $model = ActivityDefinition::class;

    public function definition(): array
    {
        $key = 'ACT-'.str_pad((string) fake()->unique()->numberBetween(100, 999), 3, '0', STR_PAD_LEFT);

        return [
            'activity_key' => $key,
            'category' => 'daily_living',
            'name' => fake()->words(2, true),
            'child_label' => fake()->sentence(3),
            'parent_prompt_label' => fake()->sentence(4),
            'quick_label' => fake()->words(2, true),
            'kind' => 'activity',
            'is_active' => true,
            'sort_order' => fake()->numberBetween(1, 100),
        ];
    }
}
