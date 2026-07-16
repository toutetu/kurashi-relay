<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_records', function (Blueprint $table) {
            $table->unsignedSmallInteger('granted_point_value')->default(0);
        });

        DB::table('task_records')
            ->select(['id', 'task_definition_id'])
            ->orderBy('id')
            ->eachById(function (object $record): void {
                $pointValue = DB::table('task_definitions')
                    ->where('id', $record->task_definition_id)
                    ->value('point_value');

                DB::table('task_records')
                    ->where('id', $record->id)
                    ->update(['granted_point_value' => (int) $pointValue]);
            });
    }

    public function down(): void
    {
        Schema::table('task_records', function (Blueprint $table) {
            $table->dropColumn('granted_point_value');
        });
    }
};
