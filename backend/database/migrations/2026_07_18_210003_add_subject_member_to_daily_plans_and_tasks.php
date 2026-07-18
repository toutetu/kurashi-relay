<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_plans', function (Blueprint $table) {
            $table->foreignId('subject_member_id')
                ->nullable()
                ->after('id')
                ->constrained('family_members')
                ->restrictOnDelete();
        });

        Schema::table('daily_tasks', function (Blueprint $table) {
            $table->foreignId('subject_member_id')
                ->nullable()
                ->after('id')
                ->constrained('family_members')
                ->restrictOnDelete();
        });

        $plansNeedingBackfill = DB::table('daily_plans')->whereNull('subject_member_id')->count();
        $tasksNeedingBackfill = DB::table('daily_tasks')->whereNull('subject_member_id')->count();

        if ($plansNeedingBackfill > 0 || $tasksNeedingBackfill > 0) {
            $childMemberId = $this->resolveChildMemberId();

            DB::table('daily_plans')
                ->whereNull('subject_member_id')
                ->update(['subject_member_id' => $childMemberId]);

            DB::table('daily_tasks')
                ->whereNull('subject_member_id')
                ->update(['subject_member_id' => $childMemberId]);

            $this->assertNoNulls('daily_plans', 'subject_member_id');
            $this->assertNoNulls('daily_tasks', 'subject_member_id');
        }
    }

    public function down(): void
    {
        Schema::table('daily_tasks', function (Blueprint $table) {
            $table->dropForeign(['subject_member_id']);
            $table->dropColumn('subject_member_id');
        });

        Schema::table('daily_plans', function (Blueprint $table) {
            $table->dropForeign(['subject_member_id']);
            $table->dropColumn('subject_member_id');
        });
    }

    private function resolveChildMemberId(): int
    {
        $ids = DB::table('family_members')
            ->where('role', 'child')
            ->pluck('id');

        if ($ids->count() !== 1) {
            throw new RuntimeException(
                'Expected exactly one child family member, found '.$ids->count().'.'
            );
        }

        return (int) $ids->first();
    }

    private function assertNoNulls(string $table, string $column): void
    {
        $count = DB::table($table)->whereNull($column)->count();

        if ($count > 0) {
            throw new RuntimeException(
                "{$table}.{$column}: found {$count} NULL value(s) after backfill."
            );
        }
    }
};
