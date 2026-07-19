<?php

namespace Database\Factories;

use App\Models\PlanQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlanQuestion>
 */
class PlanQuestionFactory extends Factory
{
    protected $model = PlanQuestion::class;

    public function definition(): array
    {
        return [
            'question_key' => fake()->unique()->slug(2),
            'label' => fake()->sentence(3),
            'answer_type' => 'text',
            'mode_rule' => null,
            'activity_definition_id' => null,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
