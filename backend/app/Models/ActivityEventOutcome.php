<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityEventOutcome extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'activity_event_id';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_event_id',
        'result',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function activityEvent(): BelongsTo
    {
        return $this->belongsTo(ActivityEvent::class);
    }
}
