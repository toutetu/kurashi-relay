<?php

namespace App\Services;

use App\Models\CalendarConnection;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use RuntimeException;
use Throwable;

final class CalendarConnectionService
{
    public function __construct(
        private readonly CalendarImportService $importService,
        private readonly GoogleCalendarClient $googleClient,
    ) {}

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
     * @param  array{display_name: string, timezone?: string|null, external_calendar_id?: string|null}  $input
     * @return array{connection: CalendarConnection, oauth_url: null}
     */
    public function createPlaceholder(array $input): array
    {
        $connection = CalendarConnection::query()->create([
            'provider' => 'google',
            'external_calendar_id' => $input['external_calendar_id']
                ?? config('services.google.calendar_id')
                ?? 'primary',
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
     * @return array{
     *   imported: int,
     *   updated: int,
     *   cancelled: int,
     *   mode: 'google_api'|'local_sample',
     *   message: string
     * }
     */
    public function sync(int $id, ?string $localDate = null): array
    {
        $connection = CalendarConnection::query()->findOrFail($id);
        $date = $localDate ?? JstDate::today();
        $dayStart = CarbonImmutable::createFromFormat('Y-m-d', $date, 'Asia/Tokyo')
            ->startOfDay();
        $dayEnd = $dayStart->addDay();

        $accessToken = (string) config('services.google.calendar_access_token', '');
        $calendarId = $connection->external_calendar_id
            ?: (string) config('services.google.calendar_id', 'primary');

        $mode = 'local_sample';
        $events = [];

        if ($accessToken !== '') {
            try {
                $events = $this->googleClient->listEvents(
                    $accessToken,
                    $calendarId,
                    $dayStart,
                    $dayEnd,
                );
                $mode = 'google_api';
            } catch (Throwable $exception) {
                throw new RuntimeException(
                    $exception->getMessage() !== ''
                        ? $exception->getMessage()
                        : 'Googleカレンダーの取得に失敗しました。',
                    previous: $exception instanceof \Exception ? $exception : null,
                );
            }
        } else {
            $events = $this->importService->localSampleEvents($date);
        }

        $counts = $this->importService->importGoogleEvents($connection, $events);

        $connection->external_calendar_id = $calendarId;
        $connection->last_synced_at = now('UTC');
        $connection->save();

        $total = $counts['imported'] + $counts['updated'] + $counts['cancelled'];
        $message = $mode === 'google_api'
            ? "Googleカレンダーから {$total} 件を取り込みました。"
            : "OAuth未接続のため、ローカル確認用サンプルを {$total} 件取り込みました。実カレンダーは GOOGLE_CALENDAR_ACCESS_TOKEN を設定してください。";

        return [
            ...$counts,
            'mode' => $mode,
            'message' => $message,
        ];
    }

    public function isGoogleApiConfigured(): bool
    {
        return (string) config('services.google.calendar_access_token', '') !== '';
    }
}
