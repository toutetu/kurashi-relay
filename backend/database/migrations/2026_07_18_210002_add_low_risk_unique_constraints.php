<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->assertPromptTemplateDuplicates();
        $this->assertPlanItemDuplicates();
        $this->assertReminderScheduleScheduledDuplicates();
        $this->assertRewardCollectionTaskRecordDuplicates();

        Schema::table('prompt_templates', function (Blueprint $table) {
            $table->unique(
                ['routine_template_id', 'prompt_level', 'sort_order'],
                'prompt_templates_routine_level_sort_unique',
            );
        });

        Schema::table('plan_items', function (Blueprint $table) {
            $table->unique(
                ['daily_plan_id', 'category', 'sort_order'],
                'plan_items_plan_category_sort_unique',
            );
        });

        DB::statement(
            'CREATE UNIQUE INDEX reminder_schedules_one_scheduled_per_task_unique '
            .'ON reminder_schedules (daily_task_id) '
            ."WHERE status = 'scheduled'"
        );

        DB::statement(
            'CREATE UNIQUE INDEX reward_collections_task_record_id_unique '
            .'ON reward_collections (task_record_id) '
            .'WHERE task_record_id IS NOT NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS reward_collections_task_record_id_unique');
        DB::statement('DROP INDEX IF EXISTS reminder_schedules_one_scheduled_per_task_unique');

        Schema::table('plan_items', function (Blueprint $table) {
            $table->dropUnique('plan_items_plan_category_sort_unique');
        });

        Schema::table('prompt_templates', function (Blueprint $table) {
            $table->dropUnique('prompt_templates_routine_level_sort_unique');
        });
    }

    private function assertPromptTemplateDuplicates(): void
    {
        $duplicates = DB::table('prompt_templates')
            ->select(
                'routine_template_id',
                'prompt_level',
                'sort_order',
                DB::raw('COUNT(*) as duplicate_count'),
            )
            ->groupBy('routine_template_id', 'prompt_level', 'sort_order')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $this->assertNoDuplicates(
            'prompt_templates (routine_template_id, prompt_level, sort_order)',
            $duplicates,
        );
    }

    private function assertPlanItemDuplicates(): void
    {
        $duplicates = DB::table('plan_items')
            ->select(
                'daily_plan_id',
                'category',
                'sort_order',
                DB::raw('COUNT(*) as duplicate_count'),
            )
            ->groupBy('daily_plan_id', 'category', 'sort_order')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $this->assertNoDuplicates(
            'plan_items (daily_plan_id, category, sort_order)',
            $duplicates,
        );
    }

    private function assertReminderScheduleScheduledDuplicates(): void
    {
        $duplicates = DB::table('reminder_schedules')
            ->select('daily_task_id', DB::raw('COUNT(*) as duplicate_count'))
            ->where('status', 'scheduled')
            ->groupBy('daily_task_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $this->assertNoDuplicates(
            'reminder_schedules scheduled rows per daily_task_id',
            $duplicates,
        );
    }

    private function assertRewardCollectionTaskRecordDuplicates(): void
    {
        $duplicates = DB::table('reward_collections')
            ->select('task_record_id', DB::raw('COUNT(*) as duplicate_count'))
            ->whereNotNull('task_record_id')
            ->groupBy('task_record_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $this->assertNoDuplicates(
            'reward_collections non-null task_record_id',
            $duplicates,
        );
    }

    /**
     * @param  Collection<int, object>  $duplicates
     */
    private function assertNoDuplicates(string $label, $duplicates): void
    {
        if ($duplicates->isNotEmpty()) {
            throw new RuntimeException(
                "{$label}: found {$duplicates->count()} duplicate group(s): ".$duplicates->toJson()
            );
        }
    }
};
