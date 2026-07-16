<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskRecordOperation extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'idempotency_key',
        'family_member_id',
        'task_definition_id',
        'record_date',
        'task_record_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'record_date' => 'date',
        ];
    }

    public function familyMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function taskDefinition(): BelongsTo
    {
        return $this->belongsTo(TaskDefinition::class);
    }

    public function taskRecord(): BelongsTo
    {
        return $this->belongsTo(TaskRecord::class);
    }
}
