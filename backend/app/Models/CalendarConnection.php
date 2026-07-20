<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CalendarConnection extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'provider',
        'external_calendar_id',
        'provider_account_id',
        'display_name',
        'timezone',
        'refresh_token_encrypted',
        'sync_token_encrypted',
        'token_expires_at',
        'is_active',
        'last_synced_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'token_expires_at' => 'datetime',
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(CalendarEvent::class);
    }
}
