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

    /**
     * @return list<array{id: string, summary: string, primary: bool, access_role: string|null}>
     */
    public function listCalendars(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList', [
                'minAccessRole' => 'reader',
                'maxResults' => 250,
            ]);

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException(
                'カレンダー一覧の取得に失敗しました。',
                previous: $exception,
            );
        }

        $items = $response->json('items') ?? [];
        if (! is_array($items)) {
            return [];
        }

        $calendars = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $id = $item['id'] ?? null;
            $summary = $item['summary'] ?? null;
            if (! is_string($id) || $id === '') {
                continue;
            }
            $calendars[] = [
                'id' => $id,
                'summary' => is_string($summary) && $summary !== '' ? $summary : $id,
                'primary' => ($item['primary'] ?? false) === true,
                'access_role' => is_string($item['accessRole'] ?? null) ? $item['accessRole'] : null,
            ];
        }

        return $calendars;
    }
}
