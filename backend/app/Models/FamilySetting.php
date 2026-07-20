<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilySetting extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'day_type',
        'report_exclude_last_war',
        'display_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'report_exclude_last_war' => 'boolean',
        ];
    }
}
