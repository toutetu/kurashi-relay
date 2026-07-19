<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_definitions', function (Blueprint $table) {
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->after('id')
                ->constrained('activity_definitions')
                ->restrictOnDelete();
        });

        Schema::table('routine_templates', function (Blueprint $table) {
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->after('slug')
                ->constrained('activity_definitions')
                ->restrictOnDelete();

            $table->foreignId('subject_member_id')
                ->nullable()
                ->after('activity_definition_id')
                ->constrained('family_members')
                ->restrictOnDelete();
        });

        if (DB::table('family_members')->where('role', 'child')->exists()) {
            $childMemberId = MigrationConstraintHelper::resolveChildMemberId();

            DB::table('routine_templates')
                ->whereNull('subject_member_id')
                ->update(['subject_member_id' => $childMemberId]);
        }
    }

    public function down(): void
    {
        Schema::table('routine_templates', function (Blueprint $table) {
            $table->dropForeign(['subject_member_id']);
            $table->dropColumn('subject_member_id');
            $table->dropForeign(['activity_definition_id']);
            $table->dropColumn('activity_definition_id');
        });

        Schema::table('task_definitions', function (Blueprint $table) {
            $table->dropForeign(['activity_definition_id']);
            $table->dropColumn('activity_definition_id');
        });
    }
};
