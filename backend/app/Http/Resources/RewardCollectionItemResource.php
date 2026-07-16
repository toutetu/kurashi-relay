<?php

namespace App\Http\Resources;

use App\Models\RewardCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RewardCollection */
final class RewardCollectionItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => $this->type,
            'item_slug' => $this->item_slug,
            'milestone_number' => $this->milestone_number,
            'obtained_on' => $this->obtained_on->toDateString(),
        ];
    }
}
