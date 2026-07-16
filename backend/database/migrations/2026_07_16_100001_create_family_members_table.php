<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->string('role', 20)->unique();
            $table->string('display_name', 50);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_members');
    }
};
