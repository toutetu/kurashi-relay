<?php

namespace App\Http\Resources;

use App\Models\ActivityEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ActivityEvent */
final class ActivityEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ActivityEvent $event */
        $event = $this->resource;

        return [
            'id' => $event->id,
            'activity_definition_id' => $event->activity_definition_id,
            'activity_key' => $event->activityDefinition?->activity_key,
            'label' => $event->activityDefinition?->quick_label ?? $event->activityDefinition?->name,
            'event_type' => $event->event_type,
            'occurred_at' => $event->occurred_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'ended_at' => $event->ended_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'source' => $event->source,
            'idempotency_key' => $event->idempotency_key,
            'cancelled' => $event->cancellation !== null,
        ];
    }
}
