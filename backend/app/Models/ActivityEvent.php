<?php

namespace App\Models;

use Database\Factories\ActivityEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ActivityEvent extends Model
{
    /** @use HasFactory<ActivityEventFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_definition_id',
        'event_type',
        'occurred_at',
        'ended_at',
        'recorded_by_member_id',
        'actor_member_id',
        'source',
        'idempotency_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function activityDefinition(): BelongsTo
    {
        return $this->belongsTo(ActivityDefinition::class);
    }

    public function recordedByMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'recorded_by_member_id');
    }

    public function actorMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'actor_member_id');
    }

    public function cancellation(): HasOne
    {
        return $this->hasOne(ActivityEventCancellation::class);
    }

    public function promptEvent(): HasOne
    {
        return $this->hasOne(PromptEvent::class);
    }

    public function planActualLinks(): HasMany
    {
        return $this->hasMany(PlanActualLink::class);
    }

    public function rewardTransactions(): HasMany
    {
        return $this->hasMany(RewardTransaction::class);
    }
}
