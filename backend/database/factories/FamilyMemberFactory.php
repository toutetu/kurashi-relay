<?php

namespace Database\Factories;

use App\Models\FamilyMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FamilyMember>
 */
class FamilyMemberFactory extends Factory
{
    protected $model = FamilyMember::class;

    public function definition(): array
    {
        return [
            'role' => 'child',
            'display_name' => fake()->firstName(),
        ];
    }

    public function mother(): static
    {
        return $this->state(fn (): array => [
            'role' => 'mother',
        ]);
    }

    public function child(): static
    {
        return $this->state(fn (): array => [
            'role' => 'child',
        ]);
    }
}
