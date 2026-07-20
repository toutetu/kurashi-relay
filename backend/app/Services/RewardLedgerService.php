<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\RewardTransaction;
use App\Models\TaskRecord;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class RewardLedgerService
{
    public function recordEarnForTaskRecord(TaskRecord $record): ?RewardTransaction
    {
        $amount = (int) $record->granted_point_value;
        if ($amount <= 0) {
            return null;
        }

        $event = ActivityEvent::query()
            ->where('idempotency_key', TaskRecordService::activityEventIdempotencyKey($record->idempotency_key))
            ->first();

        $idempotencyKey = 'earn:task-record:'.$record->idempotency_key;

        $existing = RewardTransaction::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        try {
            return RewardTransaction::query()->create([
                'member_id' => $record->family_member_id,
                'activity_event_id' => $event?->id,
                'reward_rule_id' => null,
                'transaction_type' => 'earn',
                'kind' => 'point',
                'amount' => $amount,
                'occurred_at' => $record->completed_at ?? now('UTC'),
                'idempotency_key' => $idempotencyKey,
                'reverses_transaction_id' => null,
                'reason' => 'task_record_complete',
            ]);
        } catch (QueryException) {
            return RewardTransaction::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();
        }
    }

    public function recordReversalForTaskRecord(TaskRecord $record): ?RewardTransaction
    {
        $earnKey = 'earn:task-record:'.$record->idempotency_key;
        $earn = RewardTransaction::query()
            ->where('idempotency_key', $earnKey)
            ->where('transaction_type', 'earn')
            ->first();

        if ($earn === null) {
            return null;
        }

        $alreadyReversed = RewardTransaction::query()
            ->where('reverses_transaction_id', $earn->id)
            ->where('transaction_type', 'reversal')
            ->exists();

        if ($alreadyReversed) {
            return RewardTransaction::query()
                ->where('reverses_transaction_id', $earn->id)
                ->where('transaction_type', 'reversal')
                ->first();
        }

        $reversalKey = 'reversal:task-record:'.$record->idempotency_key;

        try {
            return DB::transaction(function () use ($record, $earn, $reversalKey): RewardTransaction {
                return RewardTransaction::query()->create([
                    'member_id' => $record->family_member_id,
                    'activity_event_id' => $earn->activity_event_id,
                    'reward_rule_id' => $earn->reward_rule_id,
                    'transaction_type' => 'reversal',
                    'kind' => $earn->kind,
                    'amount' => -1 * abs((int) $earn->amount),
                    'occurred_at' => $record->cancelled_at ?? now('UTC'),
                    'idempotency_key' => $reversalKey,
                    'reverses_transaction_id' => $earn->id,
                    'reason' => 'task_record_cancel',
                ]);
            });
        } catch (QueryException) {
            return RewardTransaction::query()
                ->where('idempotency_key', $reversalKey)
                ->first();
        }
    }
}
