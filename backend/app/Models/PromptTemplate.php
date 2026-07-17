<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromptTemplate extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'routine_template_id',
        'prompt_level',
        'text',
        'is_preferred',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'prompt_level' => 'integer',
            'is_preferred' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function routineTemplate(): BelongsTo
    {
        return $this->belongsTo(RoutineTemplate::class);
    }
}
