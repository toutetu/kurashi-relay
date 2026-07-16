<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TaskRecord extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'family_member_id',
        'task_definition_id',
        'record_date',
        'completed_at',
        'cancelled_at',
        'source',
        'idempotency_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'record_date' => 'date',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function familyMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function taskDefinition(): BelongsTo
    {
        return $this->belongsTo(TaskDefinition::class);
    }

    public function rewardCollection(): HasOne
    {
        return $this->hasOne(RewardCollection::class);
    }

    public function isActive(): bool
    {
        return $this->cancelled_at === null;
    }
}
