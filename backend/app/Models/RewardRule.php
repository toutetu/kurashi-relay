<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RewardRule extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_definition_id',
        'member_id',
        'reward_kind',
        'amount',
        'valid_from',
        'valid_until',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function activityDefinition(): BelongsTo
    {
        return $this->belongsTo(ActivityDefinition::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'member_id');
    }

    public function rewardTransactions(): HasMany
    {
        return $this->hasMany(RewardTransaction::class);
    }
}
