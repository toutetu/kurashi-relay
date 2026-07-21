<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\RewardTransaction;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class RewardLedgerService
{
    public function recordEarnForOshigotoEvent(
        ActivityEvent $event,
        int $memberId,
        int $amount,
        string $clientIdempotencyKey,
    ): ?RewardTransaction {
        if ($amount <= 0) {
            return null;
        }

        $idempotencyKey = 'earn:oshigoto:'.$clientIdempotencyKey;

        $existing = RewardTransaction::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        try {
            return RewardTransaction::query()->create([
                'member_id' => $memberId,
                'activity_event_id' => $event->id,
                'reward_rule_id' => null,
                'transaction_type' => 'earn',
                'kind' => 'point',
                'amount' => $amount,
                'occurred_at' => $event->occurred_at ?? now('UTC'),
                'idempotency_key' => $idempotencyKey,
                'reverses_transaction_id' => null,
                'reason' => 'oshigoto_complete',
            ]);
        } catch (QueryException) {
            return RewardTransaction::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();
        }
    }

    public function recordReversalForOshigotoEvent(
        ActivityEvent $event,
        string $clientIdempotencyKey,
        mixed $cancelledAt = null,
    ): ?RewardTransaction {
        $earnKey = 'earn:oshigoto:'.$clientIdempotencyKey;
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

        $reversalKey = 'reversal:oshigoto:'.$clientIdempotencyKey;

        try {
            return DB::transaction(function () use ($event, $earn, $reversalKey, $cancelledAt): RewardTransaction {
                return RewardTransaction::query()->create([
                    'member_id' => $earn->member_id,
                    'activity_event_id' => $event->id,
                    'reward_rule_id' => $earn->reward_rule_id,
                    'transaction_type' => 'reversal',
                    'kind' => $earn->kind,
                    'amount' => -1 * abs((int) $earn->amount),
                    'occurred_at' => $cancelledAt ?? now('UTC'),
                    'idempotency_key' => $reversalKey,
                    'reverses_transaction_id' => $earn->id,
                    'reason' => 'oshigoto_cancel',
                ]);
            });
        } catch (QueryException) {
            return RewardTransaction::query()
                ->where('idempotency_key', $reversalKey)
                ->first();
        }
    }
}
