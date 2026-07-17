<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_member_id')->constrained('family_members');
            $table->foreignId('task_definition_id')->constrained('task_definitions');
            $table->date('record_date');
            $table->timestampTz('completed_at');
            $table->timestampTz('cancelled_at')->nullable();
            $table->string('source', 20)->default('web');
            $table->string('idempotency_key', 64)->unique();
            $table->unsignedSmallInteger('granted_point_value')->default(0);
            $table->timestampsTz();

            $table->index(['family_member_id', 'record_date']);
        });

        DB::statement(
            'CREATE UNIQUE INDEX task_records_active_unique
             ON task_records (family_member_id, task_definition_id, record_date)
             WHERE cancelled_at IS NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS task_records_active_unique');

        Schema::dropIfExists('task_records');
    }
};
