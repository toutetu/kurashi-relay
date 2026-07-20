<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_events', function (Blueprint $table) {
            $table->timestampTz('ended_at')->nullable()->after('occurred_at');
        });

        MigrationConstraintHelper::addCheck(
            'activity_events',
            'activity_events_ended_at_order_check',
            'ended_at IS NULL OR ended_at >= occurred_at',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('activity_events', 'activity_events_ended_at_order_check');

        Schema::table('activity_events', function (Blueprint $table) {
            $table->dropColumn('ended_at');
        });
    }
};
