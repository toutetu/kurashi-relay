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
        'revision_no',
        'mode',
        'started_at',
        'completed_at',
        'note',
        'recorded_by_member_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'revision_no' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function dailyPlan(): BelongsTo
    {
        return $this->belongsTo(DailyPlan::class);
    }
}
