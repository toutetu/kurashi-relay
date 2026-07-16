<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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

        DB::table('task_records')
            ->orderBy('id')
            ->eachById(function (object $record): void {
                DB::table('task_record_operations')->insert([
                    'idempotency_key' => $record->idempotency_key,
                    'family_member_id' => $record->family_member_id,
                    'task_definition_id' => $record->task_definition_id,
                    'record_date' => $record->record_date,
                    'task_record_id' => $record->id,
                    'created_at' => $record->created_at,
                    'updated_at' => $record->updated_at,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_record_operations');
    }
};
