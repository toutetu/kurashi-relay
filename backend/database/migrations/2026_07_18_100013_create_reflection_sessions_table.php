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
            $table->unsignedSmallInteger('revision_no')->default(1);
            $table->string('mode', 20);
            $table->timestampTz('started_at');
            $table->timestampTz('completed_at')->nullable();
            $table->string('note', 200)->nullable();
            $table->foreignId('recorded_by_member_id')
                ->nullable()
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->timestampsTz();

            $table->unique(
                ['daily_plan_id', 'revision_no'],
                'reflection_sessions_plan_revision_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reflection_sessions');
    }
};
