<?php

namespace App\Models;

use Database\Factories\ActivityDefinitionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActivityDefinition extends Model
{
    /** @use HasFactory<ActivityDefinitionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_key',
        'category',
        'name',
        'child_label',
        'parent_prompt_label',
        'quick_label',
        'kind',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function taskDefinitions(): HasMany
    {
        return $this->hasMany(TaskDefinition::class);
    }

    public function routineTemplates(): HasMany
    {
        return $this->hasMany(RoutineTemplate::class);
    }

    public function activityEvents(): HasMany
    {
        return $this->hasMany(ActivityEvent::class);
    }

    public function plannedActivities(): HasMany
    {
        return $this->hasMany(PlannedActivity::class);
    }

    public function planQuestions(): HasMany
    {
        return $this->hasMany(PlanQuestion::class);
    }

    public function rewardRules(): HasMany
    {
        return $this->hasMany(RewardRule::class);
    }
}
