<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            FamilyMemberSeeder::class,
            ActivityDefinitionSeeder::class,
            TaskDefinitionSeeder::class,
            KoekakeSeeder::class,
            PlanQuestionSeeder::class,
            RewardRuleSeeder::class,
        ]);
    }
}
