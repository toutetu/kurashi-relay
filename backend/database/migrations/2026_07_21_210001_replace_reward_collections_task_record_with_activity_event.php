<?php

use App\Services\TaskRecordService;
use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reward_collections', function (Blueprint $table) {
            $table->foreignId('activity_event_id')
                ->nullable()
                ->constrained('activity_events')
                ->restrictOnDelete();
        });

        $collections = DB::table('reward_collections')
            ->whereNotNull('task_record_id')
            ->whereNull('activity_event_id')
            ->get(['id', 'task_record_id']);

        foreach ($collections as $collection) {
            $taskRecord = DB::table('task_records')
                ->where('id', $collection->task_record_id)
                ->first(['idempotency_key']);

            if ($taskRecord === null) {
                continue;
            }

            $eventId = DB::table('activity_events')
                ->where(
                    'idempotency_key',
                    TaskRecordService::activityEventIdempotencyKey($taskRecord->idempotency_key),
                )
                ->value('id');

            if ($eventId === null) {
                continue;
            }

            DB::table('reward_collections')
                ->where('id', $collection->id)
                ->update(['activity_event_id' => $eventId]);
        }

        $unresolved = DB::table('reward_collections')
            ->whereNotNull('task_record_id')
            ->whereNull('activity_event_id')
            ->count();

        if ($unresolved > 0) {
            throw new RuntimeException(
                "reward_collections: found {$unresolved} row(s) with task_record_id but no matching activity_event_id after backfill."
            );
        }

        MigrationConstraintHelper::dropIndexIfExists('reward_collections_task_record_id_unique');

        Schema::table('reward_collections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('task_record_id');
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
