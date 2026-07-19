<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskDefinition extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'activity_definition_id',
        'owner_role',
        'slug',
        'category',
        'title',
        'point_value',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'point_value' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function activityDefinition(): BelongsTo
    {
        return $this->belongsTo(ActivityDefinition::class);
    }

    public function taskRecords(): HasMany
    {
        return $this->hasMany(TaskRecord::class);
    }
}
