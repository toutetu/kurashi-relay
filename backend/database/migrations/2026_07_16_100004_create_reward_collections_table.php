<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reward_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_member_id')->constrained('family_members');
            $table->string('type', 20);
            $table->string('item_slug', 50);
            $table->unsignedInteger('milestone_number');
            $table->date('obtained_on');
            $table->foreignId('task_record_id')->nullable()->constrained('task_records');
            $table->timestampsTz();

            $table->unique(['family_member_id', 'milestone_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reward_collections');
    }
};
