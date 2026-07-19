<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reward_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_member_id')->constrained('family_members');
            $table->string('kind', 20);
            $table->integer('amount');
            $table->string('reason', 200);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reward_adjustments');
    }
};
