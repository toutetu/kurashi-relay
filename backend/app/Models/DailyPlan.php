<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DailyPlan extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'subject_member_id',
        'plan_date',
        'mode',
        'school_start_period',
        'wake_up_time',
        'start_decided_with',
        'review_completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'plan_date' => 'date',
            'review_completed_at' => 'datetime',
        ];
    }

    public function subjectMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'subject_member_id');
    }

    public function planItems(): HasMany
    {
        return $this->hasMany(PlanItem::class);
    }

    public function reflectionSession(): HasOne
    {
        return $this->hasOne(ReflectionSession::class);
    }
}
