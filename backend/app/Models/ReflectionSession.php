<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReflectionSession extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_plan_id',
        'mode',
        'started_at',
        'completed_at',
        'note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function dailyPlan(): BelongsTo
    {
        return $this->belongsTo(DailyPlan::class);
    }
}
