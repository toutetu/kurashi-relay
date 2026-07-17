<?php

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
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_schedules');
    }
};
