<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_questions', function (Blueprint $table) {
            $table->id();
            $table->string('question_key', 50);
            $table->string('label', 100);
            $table->string('answer_type', 20);
            $table->string('mode_rule', 20)->nullable();
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->constrained('activity_definitions')
                ->restrictOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->unique('question_key', 'plan_questions_question_key_unique');
        });

        MigrationConstraintHelper::addCheck(
            'plan_questions',
            'plan_questions_answer_type_check',
            "answer_type IN ('text', 'multi_select', 'choice', 'time', 'boolean')",
        );
        MigrationConstraintHelper::addCheck(
            'plan_questions',
            'plan_questions_sort_order_check',
            'sort_order >= 0',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('plan_questions', 'plan_questions_sort_order_check');
        MigrationConstraintHelper::dropCheck('plan_questions', 'plan_questions_answer_type_check');

        Schema::dropIfExists('plan_questions');
    }
};
