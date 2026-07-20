<?php

namespace App\Http\Resources;

use App\Models\CalendarConnection;
use App\Services\CalendarConnectionService;
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
        /** @var CalendarConnectionService $service */
        $service = app(CalendarConnectionService::class);

        return [
            'id' => $connection->id,
            'provider' => $connection->provider,
            'display_name' => $connection->display_name,
            'external_calendar_id' => $connection->external_calendar_id,
            'provider_account_id' => $connection->provider_account_id,
            'timezone' => $connection->timezone,
            'is_active' => $connection->is_active,
            'last_synced_at' => $connection->last_synced_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'connected' => $service->isConnected($connection),
            'oauth_configured' => $service->isOAuthConfigured(),
            // 互換: 旧フロントの oauth_ready は「実データ同期可能」を意味する
            'oauth_ready' => $service->isConnected($connection),
        ];
    }
}
