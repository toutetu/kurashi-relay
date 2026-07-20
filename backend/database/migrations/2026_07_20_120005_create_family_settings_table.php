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
        Schema::create('family_settings', function (Blueprint $table) {
            $table->id();
            $table->string('day_type', 20)->default('weekday');
            $table->boolean('report_exclude_last_war')->default(true);
            $table->string('display_note', 200)->nullable();
            $table->timestampsTz();
        });

        MigrationConstraintHelper::addCheck(
            'family_settings',
            'family_settings_day_type_check',
            "day_type IN ('weekday', 'holiday', 'long_vacation')",
        );

        // Single-row settings table for one family PoC.
        DB::table('family_settings')->insert([
            'day_type' => 'weekday',
            'report_exclude_last_war' => true,
            'display_note' => null,
            'created_at' => now('UTC'),
            'updated_at' => now('UTC'),
        ]);
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('family_settings', 'family_settings_day_type_check');
        Schema::dropIfExists('family_settings');
    }
};
