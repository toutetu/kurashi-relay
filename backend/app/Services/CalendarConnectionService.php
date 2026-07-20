<?php

namespace App\Services;

use App\Models\CalendarConnection;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;
use Throwable;

final class CalendarConnectionService
{
    private const OAUTH_STATE_TTL_SECONDS = 600;

    public function __construct(
        private readonly CalendarImportService $importService,
        private readonly GoogleCalendarClient $googleClient,
        private readonly GoogleOAuthClient $oauthClient,
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
     * @return array{connection: CalendarConnection, oauth_url: string|null}
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
     * @return array{oauth_url: string, state: string}
     */
    public function beginOAuth(?int $connectionId = null): array
    {
        if (! $this->oauthClient->isConfigured()) {
            throw new RuntimeException(
                'Google OAuth が未設定です。GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を設定してください。',
            );
        }

        $state = $this->oauthClient->newState();
        Cache::put($this->oauthStateKey($state), [
            'connection_id' => $connectionId,
            'created_at' => now('UTC')->toIso8601String(),
        ], self::OAUTH_STATE_TTL_SECONDS);

        return [
            'oauth_url' => $this->oauthClient->authorizationUrl($state),
            'state' => $state,
        ];
    }

    public function completeOAuth(string $code, string $state): CalendarConnection
    {
        $payload = Cache::pull($this->oauthStateKey($state));
        if (! is_array($payload)) {
            throw new RuntimeException('OAuthの状態が無効か期限切れです。もう一度接続してください。');
        }

        $tokens = $this->oauthClient->exchangeAuthorizationCode($code);
        $calendar = $this->oauthClient->fetchPrimaryCalendar($tokens['access_token']);
        $email = $this->oauthClient->fetchAccountEmail($tokens['access_token']);

        $connectionId = $payload['connection_id'] ?? null;
        $connection = is_int($connectionId)
            ? CalendarConnection::query()->find($connectionId)
            : null;

        if ($connection === null) {
            $connection = CalendarConnection::query()
                ->where('provider', 'google')
                ->where('external_calendar_id', $calendar['id'])
                ->first();
        }

        if ($connection === null && is_string($email) && $email !== '') {
            $connection = CalendarConnection::query()
                ->where('provider', 'google')
                ->where('provider_account_id', $email)
                ->first();
        }

        if ($connection === null) {
            $connection = new CalendarConnection([
                'provider' => 'google',
            ]);
        }

        $existingRefresh = $this->decryptRefreshToken($connection);
        $refreshToken = $tokens['refresh_token'] ?? $existingRefresh;
        if ($refreshToken === null || $refreshToken === '') {
            throw new RuntimeException(
                'refresh_token を取得できませんでした。Google Cloud で同意画面を再表示するか、アプリのアクセスを削除してから再接続してください。',
            );
        }

        $connection->fill([
            'external_calendar_id' => $calendar['id'],
            'provider_account_id' => $email,
            'display_name' => $calendar['summary'],
            'timezone' => $calendar['timeZone'] ?? 'Asia/Tokyo',
            'refresh_token_encrypted' => Crypt::encryptString($refreshToken),
            'token_expires_at' => isset($tokens['expires_in'])
                ? now('UTC')->addSeconds((int) $tokens['expires_in'])
                : null,
            'is_active' => true,
        ]);
        $connection->save();

        return $connection;
    }

    public function disconnect(int $id): CalendarConnection
    {
        $connection = CalendarConnection::query()->findOrFail($id);
        $connection->refresh_token_encrypted = null;
        $connection->sync_token_encrypted = null;
        $connection->token_expires_at = null;
        $connection->is_active = false;
        $connection->save();

        return $connection;
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

        $calendarId = $connection->external_calendar_id
            ?: (string) config('services.google.calendar_id', 'primary');

        $accessToken = $this->resolveAccessToken($connection);
        $mode = 'local_sample';
        $events = [];

        if ($accessToken !== null) {
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
            : "Google未接続のため、確認用サンプルを {$total} 件取り込みました。「Googleに接続」から実カレンダーを連携してください。";

        return [
            ...$counts,
            'mode' => $mode,
            'message' => $message,
        ];
    }

    public function isOAuthConfigured(): bool
    {
        return $this->oauthClient->isConfigured();
    }

    public function isConnected(CalendarConnection $connection): bool
    {
        return $this->decryptRefreshToken($connection) !== null
            || (string) config('services.google.calendar_access_token', '') !== '';
    }

    private function resolveAccessToken(CalendarConnection $connection): ?string
    {
        $refreshToken = $this->decryptRefreshToken($connection);
        if ($refreshToken !== null) {
            if (! $this->oauthClient->isConfigured()) {
                throw new RuntimeException(
                    '保存済みの refresh_token がありますが、GOOGLE_CLIENT_ID / SECRET が未設定です。',
                );
            }

            try {
                $tokens = $this->oauthClient->refreshAccessToken($refreshToken);
            } catch (Throwable $exception) {
                throw new RuntimeException(
                    'アクセストークンの更新に失敗しました。Googleに再接続してください。',
                    previous: $exception instanceof \Exception ? $exception : null,
                );
            }

            if (($tokens['refresh_token'] ?? null) !== null) {
                $connection->refresh_token_encrypted = Crypt::encryptString($tokens['refresh_token']);
            }
            if (($tokens['expires_in'] ?? null) !== null) {
                $connection->token_expires_at = now('UTC')->addSeconds((int) $tokens['expires_in']);
            }
            $connection->save();

            return $tokens['access_token'];
        }

        $envToken = (string) config('services.google.calendar_access_token', '');

        return $envToken !== '' ? $envToken : null;
    }

    private function decryptRefreshToken(CalendarConnection $connection): ?string
    {
        $encrypted = $connection->refresh_token_encrypted;
        if (! is_string($encrypted) || $encrypted === '') {
            return null;
        }

        try {
            $plain = Crypt::decryptString($encrypted);
        } catch (Throwable) {
            return null;
        }

        return $plain !== '' ? $plain : null;
    }

    private function oauthStateKey(string $state): string
    {
        return 'google-calendar-oauth:'.$state;
    }
}
