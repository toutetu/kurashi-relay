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
            $table->foreignId('subject_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->date('plan_date');
            $table->string('mode', 20)->default('school');
            $table->string('school_start_period', 20)->nullable();
            $table->time('wake_up_time')->nullable();
            $table->string('start_decided_with', 10)->nullable();
            $table->timestampTz('review_completed_at')->nullable();
            $table->timestampsTz();

            $table->unique(
                ['subject_member_id', 'plan_date'],
                'daily_plans_subject_member_plan_date_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_plans');
    }
};
