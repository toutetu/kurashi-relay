<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_conditions', function (Blueprint $table) {
            $table->id();
            $table->date('local_date')->unique();
            $table->unsignedTinyInteger('mother_physical')->nullable();
            $table->unsignedTinyInteger('mother_mood')->nullable();
            $table->string('mother_source', 40)->nullable();
            $table->unsignedTinyInteger('daughter_physical')->nullable();
            $table->unsignedTinyInteger('daughter_mood')->nullable();
            $table->string('daughter_source', 40)->nullable();
            $table->foreignId('recorded_by_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->timestampsTz();
        });

        MigrationConstraintHelper::addCheck(
            'daily_conditions',
            'daily_conditions_scores_check',
            '(mother_physical IS NULL OR mother_physical BETWEEN 1 AND 5)'
            .' AND (mother_mood IS NULL OR mother_mood BETWEEN 1 AND 5)'
            .' AND (daughter_physical IS NULL OR daughter_physical BETWEEN 1 AND 5)'
            .' AND (daughter_mood IS NULL OR daughter_mood BETWEEN 1 AND 5)',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('daily_conditions', 'daily_conditions_scores_check');
        Schema::dropIfExists('daily_conditions');
    }
};
