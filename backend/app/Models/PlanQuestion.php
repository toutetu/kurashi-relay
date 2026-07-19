<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanQuestion extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'question_key',
        'label',
        'answer_type',
        'mode_rule',
        'activity_definition_id',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function activityDefinition(): BelongsTo
    {
        return $this->belongsTo(ActivityDefinition::class);
    }

    public function answerVersions(): HasMany
    {
        return $this->hasMany(PlanAnswerVersion::class, 'question_id');
    }
}
