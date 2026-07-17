<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReminderSchedule extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_task_id',
        'remind_at',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
        ];
    }

    public function dailyTask(): BelongsTo
    {
        return $this->belongsTo(DailyTask::class);
    }
}
