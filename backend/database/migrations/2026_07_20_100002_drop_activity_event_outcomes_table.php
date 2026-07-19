<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        MigrationConstraintHelper::dropCheck('activity_event_outcomes', 'activity_event_outcomes_result_check');

        Schema::dropIfExists('activity_event_outcomes');
    }

    public function down(): void
    {
        Schema::create('activity_event_outcomes', function (Blueprint $table) {
            $table->foreignId('activity_event_id')
                ->primary()
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->string('result', 20);
            $table->timestampsTz();
        });

        MigrationConstraintHelper::addCheck(
            'activity_event_outcomes',
            'activity_event_outcomes_result_check',
            "result IN ('completed', 'partial', 'deferred', 'unknown')",
        );
    }
};
