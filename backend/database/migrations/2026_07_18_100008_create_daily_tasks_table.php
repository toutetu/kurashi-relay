<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->date('task_date');
            $table->foreignId('routine_template_id')->constrained('routine_templates');
            $table->foreignId('planned_activity_id')
                ->nullable()
                ->constrained('planned_activities')
                ->restrictOnDelete();
            $table->string('phase', 20);
            $table->string('name', 50);
            $table->string('icon', 16);
            $table->timestampTz('scheduled_at')->nullable();
            $table->string('status', 20)->default('scheduled');
            $table->unsignedSmallInteger('prompt_count')->default(0);
            $table->timestampTz('latest_prompt_at')->nullable();
            $table->timestampsTz();

            $table->unique(['task_date', 'routine_template_id']);
            $table->index(['task_date', 'phase']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_tasks');
    }
};
