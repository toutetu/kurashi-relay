<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_event_cancellations', function (Blueprint $table) {
            $table->foreignId('activity_event_id')
                ->primary()
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->timestampTz('cancelled_at');
            $table->foreignId('cancelled_by_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->timestampsTz();
        });

        // PostgreSQL: cross-table trigger. SQLite: ActivityEventCancellationGuard at write time.
        MigrationConstraintHelper::addActivityEventCancellationOccurrenceTrigger();
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropActivityEventCancellationOccurrenceTrigger();

        Schema::dropIfExists('activity_event_cancellations');
    }
};
