<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEventVersion extends Model
{
    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'calendar_event_id',
        'version_no',
        'provider_updated_at',
        'status',
        'title',
        'start_at',
        'end_at',
        'is_all_day',
        'location',
        'description',
        'raw_payload',
        'imported_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version_no' => 'integer',
            'provider_updated_at' => 'datetime',
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'is_all_day' => 'boolean',
            'raw_payload' => 'array',
            'imported_at' => 'datetime',
        ];
    }

    public function calendarEvent(): BelongsTo
    {
        return $this->belongsTo(CalendarEvent::class);
    }
}
