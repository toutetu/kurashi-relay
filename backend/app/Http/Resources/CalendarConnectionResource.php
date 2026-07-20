<?php

namespace App\Http\Resources;

use App\Models\CalendarConnection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CalendarConnection */
final class CalendarConnectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CalendarConnection $connection */
        $connection = $this->resource;

        return [
            'id' => $connection->id,
            'provider' => $connection->provider,
            'display_name' => $connection->display_name,
            'timezone' => $connection->timezone,
            'is_active' => $connection->is_active,
            'last_synced_at' => $connection->last_synced_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'oauth_ready' => false,
        ];
    }
}
