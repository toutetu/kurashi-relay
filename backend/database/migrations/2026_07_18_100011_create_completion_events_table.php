<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('completion_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_task_id')->unique()->constrained('daily_tasks');
            $table->string('status', 20);
            $table->timestampTz('completed_at');
            $table->string('note', 200)->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('completion_events');
    }
};
