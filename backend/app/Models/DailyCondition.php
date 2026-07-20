<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyCondition extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'local_date',
        'mother_physical',
        'mother_mood',
        'mother_source',
        'daughter_physical',
        'daughter_mood',
        'daughter_source',
        'recorded_by_member_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'local_date' => 'date',
            'mother_physical' => 'integer',
            'mother_mood' => 'integer',
            'daughter_physical' => 'integer',
            'daughter_mood' => 'integer',
        ];
    }

    public function recordedByMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'recorded_by_member_id');
    }
}
