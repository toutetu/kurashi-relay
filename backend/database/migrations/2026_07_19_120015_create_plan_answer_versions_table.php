<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_answer_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_plan_id')
                ->constrained('daily_plans')
                ->restrictOnDelete();
            $table->foreignId('question_id')
                ->constrained('plan_questions')
                ->restrictOnDelete();
            $table->unsignedSmallInteger('version_no');
            $table->json('value_json');
            $table->foreignId('decided_with_member_id')
                ->nullable()
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->foreignId('recorded_by_member_id')
                ->nullable()
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->timestampTz('recorded_at');
            $table->foreignId('supersedes_version_id')
                ->nullable()
                ->constrained('plan_answer_versions')
                ->restrictOnDelete();
            $table->timestampsTz();

            $table->unique(
                ['daily_plan_id', 'question_id', 'version_no'],
                'plan_answer_versions_plan_question_version_unique',
            );
        });

        MigrationConstraintHelper::addCheck(
            'plan_answer_versions',
            'plan_answer_versions_version_no_check',
            'version_no > 0',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('plan_answer_versions', 'plan_answer_versions_version_no_check');

        Schema::dropIfExists('plan_answer_versions');
    }
};
