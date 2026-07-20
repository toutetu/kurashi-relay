<?php

namespace App\Http\Resources;

use App\Models\PlanActualLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PlanActualLink */
final class PlanActualLinkResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlanActualLink $link */
        $link = $this->resource;

        return [
            'id' => $link->id,
            'planned_activity_id' => $link->planned_activity_id,
            'activity_event_id' => $link->activity_event_id,
            'link_type' => $link->link_type,
            'matched_by' => $link->matched_by,
            'confidence' => $link->confidence,
            'created_at' => $link->created_at?->timezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
