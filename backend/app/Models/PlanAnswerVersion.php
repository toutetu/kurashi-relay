<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanAnswerVersion extends Model
{
    public $timestamps = true;

    const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_plan_id',
        'question_id',
        'version_no',
        'value_json',
        'decided_with_member_id',
        'recorded_by_member_id',
        'recorded_at',
        'supersedes_version_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value_json' => 'array',
            'version_no' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function dailyPlan(): BelongsTo
    {
        return $this->belongsTo(DailyPlan::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(PlanQuestion::class, 'question_id');
    }

    public function decidedWithMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'decided_with_member_id');
    }

    public function recordedByMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'recorded_by_member_id');
    }

    public function supersedesVersion(): BelongsTo
    {
        return $this->belongsTo(self::class, 'supersedes_version_id');
    }

    public function plannedActivities(): HasMany
    {
        return $this->hasMany(PlannedActivity::class);
    }
}
