<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routine_templates', function (Blueprint $table) {
            $table->id();
            $table->string('activity_key', 16)->nullable()->index();
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

            $table->index('phase');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routine_templates');
    }
};
