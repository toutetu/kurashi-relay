<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushSubscription extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'endpoint',
        'public_key',
        'auth_token',
        'user_agent',
        'is_active',
        'last_notified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_notified_at' => 'datetime',
        ];
    }
}
