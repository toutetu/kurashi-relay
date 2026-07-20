<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class GoogleCalendarClient
{
    /**
     * @return list<array<string, mixed>>
     */
    public function listEvents(
        string $accessToken,
        string $calendarId,
        CarbonImmutable $timeMin,
        CarbonImmutable $timeMax,
    ): array {
        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->get('https://www.googleapis.com/calendar/v3/calendars/'.rawurlencode($calendarId).'/events', [
                'timeMin' => $timeMin->utc()->toIso8601String(),
                'timeMax' => $timeMax->utc()->toIso8601String(),
                'singleEvents' => 'true',
                'orderBy' => 'startTime',
                'maxResults' => 250,
            ]);

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException(
                'Googleカレンダーの取得に失敗しました。アクセストークンとカレンダーIDを確認してください。',
                previous: $exception,
            );
        }

        /** @var list<array<string, mixed>> $items */
        $items = $response->json('items') ?? [];

        return $items;
    }
}
