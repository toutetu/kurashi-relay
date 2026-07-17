<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_task_id')->constrained('daily_tasks');
            $table->timestampTz('prompted_at');
            $table->unsignedSmallInteger('prompt_order');
            $table->string('prompt_text', 200);
            $table->string('source', 20);
            $table->string('idempotency_key', 64)->unique();
            $table->timestampTz('cancelled_at')->nullable();
            $table->timestampsTz();

            $table->index(['daily_task_id', 'prompted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prompt_events');
    }
};
