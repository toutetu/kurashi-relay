<?php

namespace App\Http\Resources;

use App\Models\DailyCondition;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin DailyCondition */
final class DailyConditionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var DailyCondition $condition */
        $condition = $this->resource;

        return [
            'local_date' => $condition->local_date?->toDateString(),
            'mother' => [
                'physical' => $condition->mother_physical,
                'mood' => $condition->mother_mood,
                'source' => $condition->mother_source,
            ],
            'daughter' => [
                'physical' => $condition->daughter_physical,
                'mood' => $condition->daughter_mood,
                'source' => $condition->daughter_source,
            ],
        ];
    }
}
