<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DailyTask extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'subject_member_id',
        'task_date',
        'routine_template_id',
        'phase',
        'name',
        'icon',
        'scheduled_at',
        'status',
        'prompt_count',
        'latest_prompt_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'task_date' => 'date',
            'scheduled_at' => 'datetime',
            'prompt_count' => 'integer',
            'latest_prompt_at' => 'datetime',
        ];
    }

    public function subjectMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'subject_member_id');
    }

    public function routineTemplate(): BelongsTo
    {
        return $this->belongsTo(RoutineTemplate::class);
    }

    public function promptEvents(): HasMany
    {
        return $this->hasMany(PromptEvent::class);
    }

    public function reminderSchedules(): HasMany
    {
        return $this->hasMany(ReminderSchedule::class);
    }

    public function completionEvent(): HasOne
    {
        return $this->hasOne(CompletionEvent::class);
    }
}
