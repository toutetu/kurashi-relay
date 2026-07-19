<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_event_id')
                ->nullable()
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->foreignId('daily_task_id')->constrained('daily_tasks');
            $table->timestampTz('prompted_at');
            $table->unsignedSmallInteger('prompt_order');
            $table->unsignedTinyInteger('prompt_level')->nullable();
            $table->string('prompt_text', 200);
            $table->string('source', 20);
            $table->string('idempotency_key', 64)->unique();
            $table->timestampTz('cancelled_at')->nullable();
            $table->timestampsTz();

            $table->index(['daily_task_id', 'prompted_at']);
        });

        MigrationConstraintHelper::addCheck(
            'prompt_events',
            'prompt_events_prompt_order_check',
            'prompt_order > 0',
        );
        MigrationConstraintHelper::addCheck(
            'prompt_events',
            'prompt_events_prompt_level_check',
            'prompt_level IS NULL OR (prompt_level BETWEEN 1 AND 3)',
        );

        MigrationConstraintHelper::createNullExcludingUniqueIndex(
            'prompt_events_activity_event_id_unique',
            'prompt_events',
            'activity_event_id',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('prompt_events_activity_event_id_unique');
        MigrationConstraintHelper::dropCheck('prompt_events', 'prompt_events_prompt_level_check');
        MigrationConstraintHelper::dropCheck('prompt_events', 'prompt_events_prompt_order_check');

        Schema::dropIfExists('prompt_events');
    }
};
