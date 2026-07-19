<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('activity_key', 16);
            $table->string('category', 30);
            $table->string('name', 100);
            $table->string('child_label', 100);
            $table->string('parent_prompt_label', 100);
            $table->string('quick_label', 100);
            $table->string('kind', 20);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestampsTz();

            $table->unique('activity_key', 'activity_definitions_activity_key_unique');
            $table->index('kind');
        });

        MigrationConstraintHelper::addCheck(
            'activity_definitions',
            'activity_definitions_kind_check',
            "kind IN ('activity', 'support', 'waiting', 'recovery', 'sleep')",
        );
        MigrationConstraintHelper::addCheck(
            'activity_definitions',
            'activity_definitions_sort_order_check',
            'sort_order >= 0',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('activity_definitions', 'activity_definitions_sort_order_check');
        MigrationConstraintHelper::dropCheck('activity_definitions', 'activity_definitions_kind_check');

        Schema::dropIfExists('activity_definitions');
    }
};
