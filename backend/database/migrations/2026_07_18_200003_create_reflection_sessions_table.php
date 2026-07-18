<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reflection_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_plan_id')->constrained('daily_plans')->cascadeOnDelete();
            $table->string('mode', 20);
            $table->timestampTz('started_at');
            $table->timestampTz('completed_at')->nullable();
            $table->string('note', 200)->nullable();
            $table->timestampsTz();

            $table->unique('daily_plan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reflection_sessions');
    }
};
