<?php

namespace App\Http\Resources;

use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PushSubscription */
final class PushSubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PushSubscription $subscription */
        $subscription = $this->resource;

        return [
            'id' => $subscription->id,
            'endpoint' => $subscription->endpoint,
            'is_active' => $subscription->is_active,
            'created_at' => $subscription->created_at?->timezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
