<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planned_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->constrained('activity_definitions')
                ->restrictOnDelete();
            $table->string('source_type', 30);
            $table->string('source_key', 100);
            $table->string('title_snapshot', 100);
            $table->string('category_snapshot', 30)->nullable();
            $table->timestampTz('planned_start_at')->nullable();
            $table->timestampTz('planned_end_at')->nullable();
            $table->boolean('is_all_day')->default(false);
            $table->date('local_date');
            $table->string('status', 20)->default('planned');
            $table->foreignId('routine_template_id')
                ->nullable()
                ->constrained('routine_templates')
                ->restrictOnDelete();
            $table->unsignedBigInteger('plan_answer_version_id')->nullable();
            $table->unsignedBigInteger('calendar_event_version_id')->nullable();
            $table->timestampsTz();

            $table->unique(
                ['source_type', 'source_key'],
                'planned_activities_source_unique',
            );
            $table->index(['subject_member_id', 'local_date']);
            $table->index('plan_answer_version_id');
            $table->index('calendar_event_version_id');
        });

        MigrationConstraintHelper::addCheck(
            'planned_activities',
            'planned_activities_source_type_check',
            "source_type IN ('routine', 'child_plan', 'manual', 'google_calendar')",
        );
        MigrationConstraintHelper::addCheck(
            'planned_activities',
            'planned_activities_status_check',
            "status IN ('planned', 'changed', 'cancelled')",
        );
        MigrationConstraintHelper::addCheck(
            'planned_activities',
            'planned_activities_time_order_check',
            'planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at >= planned_start_at',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('planned_activities', 'planned_activities_time_order_check');
        MigrationConstraintHelper::dropCheck('planned_activities', 'planned_activities_status_check');
        MigrationConstraintHelper::dropCheck('planned_activities', 'planned_activities_source_type_check');

        Schema::dropIfExists('planned_activities');
    }
};
