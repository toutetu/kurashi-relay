<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RoutineTemplate extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'slug',
        'activity_definition_id',
        'subject_member_id',
        'activity_key',
        'phase',
        'name',
        'icon',
        'parent_prompt_label',
        'child_label',
        'quick_label',
        'default_time',
        'daily_limit',
        'display_rule',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'daily_limit' => 'integer',
            'display_rule' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function activityDefinition(): BelongsTo
    {
        return $this->belongsTo(ActivityDefinition::class);
    }

    public function subjectMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'subject_member_id');
    }

    public function promptTemplates(): HasMany
    {
        return $this->hasMany(PromptTemplate::class);
    }

    public function plannedActivities(): HasMany
    {
        return $this->hasMany(PlannedActivity::class);
    }

    public function dailyTasks(): HasMany
    {
        return $this->hasMany(DailyTask::class);
    }
}
