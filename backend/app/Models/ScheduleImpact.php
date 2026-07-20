<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleImpact extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'planned_activity_id',
        'cause_activity_event_id',
        'impact_type',
        'lost_minutes',
        'interruption_count',
        'actual_return_at',
        'note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lost_minutes' => 'integer',
            'interruption_count' => 'integer',
            'actual_return_at' => 'datetime',
        ];
    }

    public function plannedActivity(): BelongsTo
    {
        return $this->belongsTo(PlannedActivity::class);
    }

    public function causeActivityEvent(): BelongsTo
    {
        return $this->belongsTo(ActivityEvent::class, 'cause_activity_event_id');
    }
}
