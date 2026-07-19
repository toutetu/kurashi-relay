<?php

namespace Database\Seeders;

use App\Models\ActivityDefinition;
use Database\Support\ActivityDefinitionCatalog;
use Illuminate\Database\Seeder;

class ActivityDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (ActivityDefinitionCatalog::definitions() as $definition) {
            ActivityDefinition::query()->updateOrCreate(
                ['activity_key' => $definition['activity_key']],
                [
                    'category' => $definition['category'],
                    'name' => $definition['name'],
                    'child_label' => $definition['child_label'],
                    'parent_prompt_label' => $definition['parent_prompt_label'],
                    'quick_label' => $definition['quick_label'],
                    'kind' => $definition['kind'],
                    'is_active' => true,
                    'sort_order' => $definition['sort_order'],
                ],
            );
        }
    }
}
