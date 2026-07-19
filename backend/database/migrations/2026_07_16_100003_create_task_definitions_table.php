<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->constrained('activity_definitions')
                ->restrictOnDelete();
            $table->string('owner_role', 20)->index();
            $table->string('slug', 50);
            $table->string('category', 30)->nullable();
            $table->string('title', 100);
            $table->unsignedSmallInteger('point_value')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestampsTz();

            $table->unique(['owner_role', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_definitions');
    }
};
