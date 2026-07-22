<?php

use Database\Support\ActivityDefinitionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('activity_events', 'note')) {
            Schema::table('activity_events', function (Blueprint $table) {
                $table->string('note', 500)->nullable()->after('idempotency_key');
            });
        }

        $now = now('UTC');
        $keys = [
            'ACT-046',
            'ACT-053',
        ];

        foreach (ActivityDefinitionCatalog::definitions() as $definition) {
            if (! in_array($definition['activity_key'], $keys, true)) {
                continue;
            }

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
        DB::table('activity_definitions')
            ->where('activity_key', 'ACT-046')
            ->update([
                'name' => '就労準備',
                'child_label' => '就労準備をした',
                'parent_prompt_label' => '就労準備をした',
                'quick_label' => '就労準備',
                'updated_at' => now('UTC'),
            ]);

        DB::table('activity_definitions')
            ->where('activity_key', 'ACT-053')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('activity_events')
                    ->whereColumn('activity_events.activity_definition_id', 'activity_definitions.id');
            })
            ->delete();

        if (Schema::hasColumn('activity_events', 'note')) {
            Schema::table('activity_events', function (Blueprint $table) {
                $table->dropColumn('note');
            });
        }
    }
};
