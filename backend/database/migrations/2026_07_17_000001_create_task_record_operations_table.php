<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_record_operations', function (Blueprint $table) {
            $table->id();
            $table->string('idempotency_key', 64)->unique();
            $table->foreignId('family_member_id')->constrained('family_members');
            $table->foreignId('task_definition_id')->constrained('task_definitions');
            $table->date('record_date');
            $table->foreignId('task_record_id')->constrained('task_records');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_record_operations');
    }
};
