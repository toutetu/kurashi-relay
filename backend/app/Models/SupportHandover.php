<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportHandover extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'assignee_label',
        'conditions_text',
        'completion_criteria',
        'result_text',
        'returned_to_mother_at',
        'status',
        'source_kind',
        'due_at',
        'local_date',
        'recorded_by_member_id',
        'cancelled_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'returned_to_mother_at' => 'datetime',
            'due_at' => 'datetime',
            'local_date' => 'date',
            'cancelled_at' => 'datetime',
        ];
    }

    public function recordedByMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'recorded_by_member_id');
    }
}
