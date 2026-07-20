<?php

namespace App\Services;

use App\Models\CalendarConnection;
use Illuminate\Support\Collection;

final class CalendarConnectionService
{
    /**
     * @return Collection<int, CalendarConnection>
     */
    public function list(): Collection
    {
        return CalendarConnection::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  array{display_name: string, timezone?: string|null}  $input
     * @return array{connection: CalendarConnection, oauth_url: null}
     */
    public function createPlaceholder(array $input): array
    {
        $connection = CalendarConnection::query()->create([
            'provider' => 'google',
            'external_calendar_id' => null,
            'provider_account_id' => null,
            'display_name' => $input['display_name'],
            'timezone' => $input['timezone'] ?? 'Asia/Tokyo',
            'refresh_token_encrypted' => null,
            'sync_token_encrypted' => null,
            'token_expires_at' => null,
            'is_active' => true,
            'last_synced_at' => null,
        ]);

        return [
            'connection' => $connection,
            'oauth_url' => null,
        ];
    }

    /**
     * @return array{imported: int, message: string}
     */
    public function sync(int $id): array
    {
        $connection = CalendarConnection::query()->findOrFail($id);

        // OAuth未接続のため同期は no-op。
        $connection->last_synced_at = now('UTC');
        $connection->save();

        return [
            'imported' => 0,
            'message' => 'Googleカレンダー連携は準備中です。予定の取込はまだ行われません。',
        ];
    }
}
