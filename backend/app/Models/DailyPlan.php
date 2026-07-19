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
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'plan_date' => 'date',
        ];
    }

    public function subjectMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'subject_member_id');
    }

    public function reflectionSession(): HasOne
    {
        return $this->hasOne(ReflectionSession::class)->latestOfMany('revision_no');
    }

    public function reflectionSessions(): HasMany
    {
        return $this->hasMany(ReflectionSession::class);
    }

    public function answerVersions(): HasMany
    {
        return $this->hasMany(PlanAnswerVersion::class);
    }
}
