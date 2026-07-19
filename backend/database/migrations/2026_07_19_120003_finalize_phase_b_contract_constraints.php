<?php

use Database\Support\MigrationConstraintHelper;
use Database\Support\RoutineTemplateSlugCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->backfillRoutineTemplateSlugs();

        if (DB::table('family_members')->where('role', 'child')->exists()) {
            $childMemberId = MigrationConstraintHelper::resolveChildMemberId();

            DB::table('daily_plans')
                ->whereNull('subject_member_id')
                ->update(['subject_member_id' => $childMemberId]);

            DB::table('daily_tasks')
                ->whereNull('subject_member_id')
                ->update(['subject_member_id' => $childMemberId]);

            DB::table('routine_templates')
                ->whereNull('subject_member_id')
                ->update(['subject_member_id' => $childMemberId]);
        }

        if (DB::table('daily_plans')->exists()) {
            MigrationConstraintHelper::assertNoNulls('daily_plans', 'subject_member_id');
            MigrationConstraintHelper::assertNoNulls('daily_tasks', 'subject_member_id');
        }

        if (DB::table('routine_templates')->exists()) {
            MigrationConstraintHelper::assertNoNulls('routine_templates', 'slug');
            MigrationConstraintHelper::assertNoNulls('routine_templates', 'subject_member_id');
        }

        MigrationConstraintHelper::setNotNull('daily_plans', 'subject_member_id');
        MigrationConstraintHelper::setNotNull('daily_tasks', 'subject_member_id');
        MigrationConstraintHelper::setNotNull('routine_templates', 'slug');
        MigrationConstraintHelper::setNotNull('routine_templates', 'subject_member_id');

        Schema::table('daily_plans', function (Blueprint $table) {
            $table->dropUnique(['plan_date']);
            $table->unique(
                ['subject_member_id', 'plan_date'],
                'daily_plans_subject_member_plan_date_unique',
            );
        });

        MigrationConstraintHelper::addCheck(
            'routine_templates',
            'routine_templates_daily_limit_check',
            'daily_limit IS NULL OR daily_limit > 0',
        );
        MigrationConstraintHelper::addCheck(
            'routine_templates',
            'routine_templates_sort_order_check',
            'sort_order >= 0',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::setNullable('routine_templates', 'subject_member_id');
        MigrationConstraintHelper::setNullable('routine_templates', 'slug');
        MigrationConstraintHelper::setNullable('daily_tasks', 'subject_member_id');
        MigrationConstraintHelper::setNullable('daily_plans', 'subject_member_id');

        MigrationConstraintHelper::dropCheck('routine_templates', 'routine_templates_sort_order_check');
        MigrationConstraintHelper::dropCheck('routine_templates', 'routine_templates_daily_limit_check');

        Schema::table('daily_plans', function (Blueprint $table) {
            $table->dropUnique('daily_plans_subject_member_plan_date_unique');
            $table->unique('plan_date');
        });
    }

    private function backfillRoutineTemplateSlugs(): void
    {
        $templates = DB::table('routine_templates')
            ->select('id', 'phase', 'sort_order', 'slug')
            ->orderBy('id')
            ->get();

        foreach ($templates as $template) {
            if ($template->slug !== null) {
                continue;
            }

            $slug = RoutineTemplateSlugCatalog::slugFor($template->phase, (int) $template->sort_order);

            DB::table('routine_templates')
                ->where('id', $template->id)
                ->whereNull('slug')
                ->update(['slug' => $slug]);
        }
    }
};
