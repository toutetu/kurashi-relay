<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminder_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_task_id')->constrained('daily_tasks');
            $table->timestampTz('remind_at');
            $table->string('status', 20)->default('scheduled');
            $table->timestampsTz();

            $table->index(['daily_task_id', 'status']);
        });

        MigrationConstraintHelper::createPartialUniqueIndex(
            'reminder_schedules_one_scheduled_per_task_unique',
            'reminder_schedules',
            'daily_task_id',
            "status = 'scheduled'",
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('reminder_schedules_one_scheduled_per_task_unique');

        Schema::dropIfExists('reminder_schedules');
    }
};
