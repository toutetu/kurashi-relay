<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CalendarEvent extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'calendar_connection_id',
        'external_event_id',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(CalendarConnection::class, 'calendar_connection_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(CalendarEventVersion::class);
    }
}
