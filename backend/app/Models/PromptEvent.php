<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromptEvent extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_task_id',
        'prompted_at',
        'prompt_order',
        'prompt_text',
        'source',
        'idempotency_key',
        'cancelled_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'prompted_at' => 'datetime',
            'prompt_order' => 'integer',
            'cancelled_at' => 'datetime',
        ];
    }

    public function dailyTask(): BelongsTo
    {
        return $this->belongsTo(DailyTask::class);
    }

    public function isActive(): bool
    {
        return $this->cancelled_at === null;
    }
}
