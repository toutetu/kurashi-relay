<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('plan_items');

        Schema::table('daily_plans', function (Blueprint $table) {
            $table->dropColumn([
                'school_start_period',
                'wake_up_time',
                'start_decided_with',
                'review_completed_at',
            ]);
        });
    }

    public function down(): void
    {
        // 旧 shape は再作成できるが、up() で削除した plan_items / 旧列のデータは復元できない。

        Schema::table('daily_plans', function (Blueprint $table) {
            $table->string('school_start_period', 20)->nullable();
            $table->time('wake_up_time')->nullable();
            $table->string('start_decided_with', 10)->nullable();
            $table->timestampTz('review_completed_at')->nullable();
        });

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
};
