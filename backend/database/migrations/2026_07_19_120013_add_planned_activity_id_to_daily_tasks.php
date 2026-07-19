<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_tasks', function (Blueprint $table) {
            $table->foreignId('planned_activity_id')
                ->nullable()
                ->after('routine_template_id')
                ->constrained('planned_activities')
                ->restrictOnDelete();
        });

        // SQLite table rebuilds drop NOT NULL triggers applied in 120003.
        MigrationConstraintHelper::setNotNull('daily_tasks', 'subject_member_id');
    }

    public function down(): void
    {
        MigrationConstraintHelper::setNullable('daily_tasks', 'subject_member_id');

        Schema::table('daily_tasks', function (Blueprint $table) {
            $table->dropForeign(['planned_activity_id']);
            $table->dropColumn('planned_activity_id');
        });

        MigrationConstraintHelper::setNotNull('daily_tasks', 'subject_member_id');
    }
};
