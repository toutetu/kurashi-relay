<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planned_activities', function (Blueprint $table) {
            $table->foreign('plan_answer_version_id')
                ->references('id')
                ->on('plan_answer_versions')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('planned_activities', function (Blueprint $table) {
            $table->dropForeign(['plan_answer_version_id']);
        });
    }
};
