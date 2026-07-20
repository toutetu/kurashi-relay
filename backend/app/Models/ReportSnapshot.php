<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSnapshot extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'audience',
        'period_start',
        'period_end',
        'title',
        'payload',
        'excludes_last_war',
        'created_by_member_id',
        'revoked_at',
        'share_token',
        'share_expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'payload' => 'array',
            'excludes_last_war' => 'boolean',
            'revoked_at' => 'datetime',
            'share_expires_at' => 'datetime',
        ];
    }

    public function createdByMember(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'created_by_member_id');
    }
}
