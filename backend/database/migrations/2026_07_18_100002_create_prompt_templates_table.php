<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_template_id')->constrained('routine_templates')->cascadeOnDelete();
            $table->unsignedTinyInteger('prompt_level');
            $table->string('text', 200);
            $table->boolean('is_preferred')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestampsTz();

            $table->unique(
                ['routine_template_id', 'prompt_level', 'sort_order'],
                'prompt_templates_routine_level_sort_unique',
            );
            $table->index(['routine_template_id', 'prompt_level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prompt_templates');
    }
};
