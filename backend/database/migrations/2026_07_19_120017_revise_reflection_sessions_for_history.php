<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * down() is safe only when reflection_sessions is empty or each daily_plan_id has
     * at most one row. Multiple revisions require backup restore instead of rollback.
     */
    public function up(): void
    {
        Schema::table('reflection_sessions', function (Blueprint $table) {
            $table->dropUnique(['daily_plan_id']);
        });

        Schema::table('reflection_sessions', function (Blueprint $table) {
            $table->unsignedSmallInteger('revision_no')->default(1)->after('daily_plan_id');
            $table->foreignId('recorded_by_member_id')
                ->nullable()
                ->after('note')
                ->constrained('family_members')
                ->restrictOnDelete();

            $table->unique(
                ['daily_plan_id', 'revision_no'],
                'reflection_sessions_plan_revision_unique',
            );
        });

        if (DB::table('reflection_sessions')->exists()) {
            DB::table('reflection_sessions')
                ->whereNull('revision_no')
                ->update(['revision_no' => 1]);
        }
    }

    public function down(): void
    {
        $hasMultipleRevisionsPerPlan = DB::table('reflection_sessions')
            ->select('daily_plan_id')
            ->groupBy('daily_plan_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasMultipleRevisionsPerPlan) {
            throw new RuntimeException(
                'Cannot roll back reflection history migration while multiple revisions exist per daily_plan_id. '
                .'Restore from a full logical backup instead.'
            );
        }

        Schema::table('reflection_sessions', function (Blueprint $table) {
            $table->dropUnique('reflection_sessions_plan_revision_unique');
            $table->dropForeign(['recorded_by_member_id']);
            $table->dropColumn(['revision_no', 'recorded_by_member_id']);
            $table->unique('daily_plan_id');
        });
    }
};
