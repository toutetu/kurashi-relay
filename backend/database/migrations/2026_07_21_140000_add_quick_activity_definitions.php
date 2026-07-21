<?php

use Database\Support\ActivityDefinitionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now('UTC');

        foreach (ActivityDefinitionCatalog::quickActivityDefinitions() as $definition) {
            DB::table('activity_definitions')->updateOrInsert(
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
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }
    }

    public function down(): void
    {
        $keys = array_column(
            ActivityDefinitionCatalog::quickActivityDefinitions(),
            'activity_key',
        );

        DB::table('activity_definitions')
            ->whereIn('activity_key', $keys)
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('activity_events')
                    ->whereColumn('activity_events.activity_definition_id', 'activity_definitions.id');
            })
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('planned_activities')
                    ->whereColumn('planned_activities.activity_definition_id', 'activity_definitions.id');
            })
            ->delete();
    }
};
