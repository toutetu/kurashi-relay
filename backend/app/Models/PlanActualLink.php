<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanActualLink extends Model
{
    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'planned_activity_id',
        'activity_event_id',
        'link_type',
        'matched_by',
        'confidence',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'confidence' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function plannedActivity(): BelongsTo
    {
        return $this->belongsTo(PlannedActivity::class);
    }

    public function activityEvent(): BelongsTo
    {
        return $this->belongsTo(ActivityEvent::class);
    }
}
