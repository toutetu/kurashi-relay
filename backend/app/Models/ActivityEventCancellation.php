<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityEventCancellation extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'activity_event_id';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_event_id',
        'cancelled_at',
        'cancelled_by_member_id',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cancelled_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function activityEvent(): BelongsTo
    {
        return $this->belongsTo(ActivityEvent::class);
    }

    public function cancelledByMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'cancelled_by_member_id');
    }
}
