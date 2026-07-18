<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_plans', function (Blueprint $table) {
            $table->id();
            $table->date('plan_date');
            $table->string('mode', 20)->default('school');
            $table->string('school_start_period', 20)->nullable();
            $table->time('wake_up_time')->nullable();
            $table->string('start_decided_with', 10)->nullable();
            $table->timestampTz('review_completed_at')->nullable();
            $table->timestampsTz();

            $table->unique('plan_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_plans');
    }
};
