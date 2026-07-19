<?php

namespace App\Models;

use Database\Factories\PlannedActivityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlannedActivity extends Model
{
    /** @use HasFactory<PlannedActivityFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'subject_member_id',
        'activity_definition_id',
        'source_type',
        'source_key',
        'title_snapshot',
        'category_snapshot',
        'planned_start_at',
        'planned_end_at',
        'is_all_day',
        'local_date',
        'status',
        'routine_template_id',
        'plan_answer_version_id',
        'calendar_event_version_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'planned_start_at' => 'datetime',
            'planned_end_at' => 'datetime',
            'is_all_day' => 'boolean',
            'local_date' => 'date',
        ];
    }

    public function subjectMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'subject_member_id');
    }

    public function activityDefinition(): BelongsTo
    {
        return $this->belongsTo(ActivityDefinition::class);
    }

    public function routineTemplate(): BelongsTo
    {
        return $this->belongsTo(RoutineTemplate::class);
    }

    public function planAnswerVersion(): BelongsTo
    {
        return $this->belongsTo(PlanAnswerVersion::class);
    }

    public function planActualLinks(): HasMany
    {
        return $this->hasMany(PlanActualLink::class);
    }

    public function dailyTasks(): HasMany
    {
        return $this->hasMany(DailyTask::class);
    }
}
