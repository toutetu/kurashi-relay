<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DailyPlan extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'plan_date',
        'mode',
        'school_start_period',
        'wake_up_time',
        'today_state',
        'tomorrow_items_state',
        'start_state',
        'review_completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'plan_date' => 'date',
            'review_completed_at' => 'datetime',
        ];
    }

    public function planItems(): HasMany
    {
        return $this->hasMany(PlanItem::class);
    }

    public function reflectionSession(): HasOne
    {
        return $this->hasOne(ReflectionSession::class);
    }
}
