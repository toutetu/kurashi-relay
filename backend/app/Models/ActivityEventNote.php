<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityEventNote extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_event_id',
        'note',
    ];

    public function activityEvent(): BelongsTo
    {
        return $this->belongsTo(ActivityEvent::class);
    }
}
