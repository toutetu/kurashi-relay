<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_actual_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planned_activity_id')
                ->constrained('planned_activities')
                ->restrictOnDelete();
            $table->foreignId('activity_event_id')
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->string('link_type', 20);
            $table->string('matched_by', 20);
            $table->unsignedTinyInteger('confidence');
            $table->timestampsTz();

            $table->unique(
                ['planned_activity_id', 'activity_event_id', 'link_type'],
                'plan_actual_links_unique',
            );
        });

        MigrationConstraintHelper::addCheck(
            'plan_actual_links',
            'plan_actual_links_link_type_check',
            "link_type IN ('primary', 'prompt', 'support', 'partial', 'interruption', 'cause')",
        );
        MigrationConstraintHelper::addCheck(
            'plan_actual_links',
            'plan_actual_links_matched_by_check',
            "matched_by IN ('automatic', 'manual')",
        );
        MigrationConstraintHelper::addCheck(
            'plan_actual_links',
            'plan_actual_links_confidence_check',
            'confidence BETWEEN 0 AND 100',
        );

        DB::statement(
            'CREATE INDEX plan_actual_links_event_type ON plan_actual_links (activity_event_id, link_type)'
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('plan_actual_links_event_type');
        MigrationConstraintHelper::dropCheck('plan_actual_links', 'plan_actual_links_confidence_check');
        MigrationConstraintHelper::dropCheck('plan_actual_links', 'plan_actual_links_matched_by_check');
        MigrationConstraintHelper::dropCheck('plan_actual_links', 'plan_actual_links_link_type_check');

        Schema::dropIfExists('plan_actual_links');
    }
};
