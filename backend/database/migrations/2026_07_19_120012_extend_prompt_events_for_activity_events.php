<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prompt_events', function (Blueprint $table) {
            $table->foreignId('activity_event_id')
                ->nullable()
                ->after('id')
                ->constrained('activity_events')
                ->restrictOnDelete();

            $table->unsignedTinyInteger('prompt_level')->nullable()->after('prompt_order');
        });

        MigrationConstraintHelper::addCheck(
            'prompt_events',
            'prompt_events_prompt_order_check',
            'prompt_order > 0',
        );
        MigrationConstraintHelper::addCheck(
            'prompt_events',
            'prompt_events_prompt_level_check',
            'prompt_level IS NULL OR (prompt_level BETWEEN 1 AND 3)',
        );

        MigrationConstraintHelper::createNullExcludingUniqueIndex(
            'prompt_events_activity_event_id_unique',
            'prompt_events',
            'activity_event_id',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('prompt_events_activity_event_id_unique');
        MigrationConstraintHelper::dropCheck('prompt_events', 'prompt_events_prompt_level_check');
        MigrationConstraintHelper::dropCheck('prompt_events', 'prompt_events_prompt_order_check');

        Schema::table('prompt_events', function (Blueprint $table) {
            $table->dropForeign(['activity_event_id']);
            $table->dropColumn(['activity_event_id', 'prompt_level']);
        });
    }
};
