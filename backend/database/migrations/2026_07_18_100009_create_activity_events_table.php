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
        Schema::create('activity_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_definition_id')
                ->constrained('activity_definitions')
                ->restrictOnDelete();
            $table->string('event_type', 20);
            $table->timestampTz('occurred_at');
            $table->foreignId('recorded_by_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->string('source', 30);
            $table->string('idempotency_key', 64);
            $table->timestampsTz();

            $table->unique('idempotency_key', 'activity_events_idempotency_key_unique');
            $table->index(['event_type', 'occurred_at']);
        });

        MigrationConstraintHelper::addCheck(
            'activity_events',
            'activity_events_event_type_check',
            "event_type IN ('activity', 'prompt', 'support')",
        );
        MigrationConstraintHelper::addCheck(
            'activity_events',
            'activity_events_source_check',
            "source IN ('mother_quick', 'daughter_task', 'oshigoto', 'koekake', 'manual', 'import')",
        );

        DB::statement(
            'CREATE INDEX activity_events_prompt_time ON activity_events (event_type, occurred_at DESC) '
            ."WHERE event_type = 'prompt'"
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('activity_events_prompt_time');
        MigrationConstraintHelper::dropCheck('activity_events', 'activity_events_source_check');
        MigrationConstraintHelper::dropCheck('activity_events', 'activity_events_event_type_check');

        Schema::dropIfExists('activity_events');
    }
};
