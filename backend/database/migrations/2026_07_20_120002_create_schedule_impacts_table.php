<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_impacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planned_activity_id')
                ->constrained('planned_activities')
                ->restrictOnDelete();
            $table->foreignId('cause_activity_event_id')
                ->nullable()
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->string('impact_type', 40);
            $table->unsignedInteger('lost_minutes')->nullable();
            $table->unsignedInteger('interruption_count')->nullable();
            $table->timestampTz('actual_return_at')->nullable();
            $table->text('note')->nullable();
            $table->timestampsTz();

            $table->index('planned_activity_id');
        });

        MigrationConstraintHelper::addCheck(
            'schedule_impacts',
            'schedule_impacts_type_check',
            "impact_type IN ('delayed', 'shortened', 'interrupted', 'cancelled', 'postponed', 'moved_to_night', 'changed_to_support', 'changed_to_recovery')",
        );
        MigrationConstraintHelper::addCheck(
            'schedule_impacts',
            'schedule_impacts_lost_minutes_check',
            'lost_minutes IS NULL OR lost_minutes >= 0',
        );
        MigrationConstraintHelper::addCheck(
            'schedule_impacts',
            'schedule_impacts_interruption_check',
            'interruption_count IS NULL OR interruption_count >= 0',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('schedule_impacts', 'schedule_impacts_interruption_check');
        MigrationConstraintHelper::dropCheck('schedule_impacts', 'schedule_impacts_lost_minutes_check');
        MigrationConstraintHelper::dropCheck('schedule_impacts', 'schedule_impacts_type_check');
        Schema::dropIfExists('schedule_impacts');
    }
};
