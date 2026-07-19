<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_plan_id')->constrained('daily_plans')->cascadeOnDelete();
            $table->string('category', 20);
            $table->string('title', 100);
            $table->string('status', 20)->default('planned');
            $table->string('decided_with', 10)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestampsTz();

            $table->unique(
                ['daily_plan_id', 'category', 'sort_order'],
                'plan_items_plan_category_sort_unique',
            );
            $table->index(['daily_plan_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_items');
    }
};
