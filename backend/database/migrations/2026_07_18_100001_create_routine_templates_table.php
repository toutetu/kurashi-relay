<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routine_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50);
            $table->string('activity_key', 16)->nullable()->index();
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->constrained('activity_definitions')
                ->restrictOnDelete();
            $table->foreignId('subject_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->string('phase', 20);
            $table->string('name', 50);
            $table->string('icon', 16);
            $table->string('parent_prompt_label', 100)->nullable();
            $table->string('child_label', 50)->nullable();
            $table->string('quick_label', 50)->nullable();
            $table->time('default_time')->nullable();
            $table->unsignedSmallInteger('daily_limit')->nullable();
            $table->json('display_rule')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->unique('slug', 'routine_templates_slug_unique');
            $table->index('phase');
        });

        MigrationConstraintHelper::addCheck(
            'routine_templates',
            'routine_templates_daily_limit_check',
            'daily_limit IS NULL OR daily_limit > 0',
        );
        MigrationConstraintHelper::addCheck(
            'routine_templates',
            'routine_templates_sort_order_check',
            'sort_order >= 0',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('routine_templates', 'routine_templates_sort_order_check');
        MigrationConstraintHelper::dropCheck('routine_templates', 'routine_templates_daily_limit_check');

        Schema::dropIfExists('routine_templates');
    }
};
