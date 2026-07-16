<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyMember extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'role',
        'display_name',
    ];

    public function taskRecords(): HasMany
    {
        return $this->hasMany(TaskRecord::class);
    }

    public function rewardCollections(): HasMany
    {
        return $this->hasMany(RewardCollection::class);
    }

    public function rewardAdjustments(): HasMany
    {
        return $this->hasMany(RewardAdjustment::class);
    }
}
