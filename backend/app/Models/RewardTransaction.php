<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RewardTransaction extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'member_id',
        'activity_event_id',
        'reward_rule_id',
        'transaction_type',
        'kind',
        'amount',
        'occurred_at',
        'idempotency_key',
        'reverses_transaction_id',
        'reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'occurred_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'member_id');
    }

    public function activityEvent(): BelongsTo
    {
        return $this->belongsTo(ActivityEvent::class);
    }

    public function rewardRule(): BelongsTo
    {
        return $this->belongsTo(RewardRule::class);
    }

    public function reversesTransaction(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reverses_transaction_id');
    }
}
