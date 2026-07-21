<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('reward_collections_task_record_id_unique');

        Schema::table('reward_collections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('task_record_id');
            $table->foreignId('activity_event_id')
                ->nullable()
                ->constrained('activity_events')
                ->nullOnDelete();
        });

        MigrationConstraintHelper::createPartialUniqueIndex(
            'reward_collections_activity_event_id_unique',
            'reward_collections',
            'activity_event_id',
            'activity_event_id IS NOT NULL',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('reward_collections_activity_event_id_unique');

        Schema::table('reward_collections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('activity_event_id');
            $table->foreignId('task_record_id')
                ->nullable()
                ->constrained('task_records');
        });

        MigrationConstraintHelper::createPartialUniqueIndex(
            'reward_collections_task_record_id_unique',
            'reward_collections',
            'task_record_id',
            'task_record_id IS NOT NULL',
        );
    }
};
