<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RewardCollection extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'family_member_id',
        'type',
        'item_slug',
        'milestone_number',
        'obtained_on',
        'task_record_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'milestone_number' => 'integer',
            'obtained_on' => 'date',
        ];
    }

    public function familyMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function taskRecord(): BelongsTo
    {
        return $this->belongsTo(TaskRecord::class);
    }
}
