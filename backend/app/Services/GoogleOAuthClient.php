<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

final class GoogleOAuthClient
{
    public function isConfigured(): bool
    {
        return $this->clientId() !== '' && $this->clientSecret() !== '';
    }

    public function redirectUri(): string
    {
        $configured = (string) config('services.google.redirect_uri', '');
        if ($configured !== '') {
            return $configured;
        }

        return rtrim((string) config('app.url'), '/').'/calendar/oauth/callback';
    }

    public function authorizationUrl(string $state): string
    {
        $this->assertConfigured();

        $query = http_build_query([
            'client_id' => $this->clientId(),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', [
                'https://www.googleapis.com/auth/calendar.readonly',
                'openid',
                'email',
            ]),
            'access_type' => 'offline',
            'include_granted_scopes' => 'true',
            'prompt' => 'consent',
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return 'https://accounts.google.com/o/oauth2/v2/auth?'.$query;
    }

    /**
     * @return array{
     *   access_token: string,
     *   refresh_token: string|null,
     *   expires_in: int|null,
     *   token_type: string|null,
     *   scope: string|null
     * }
     */
    public function exchangeAuthorizationCode(string $code): array
    {
        $this->assertConfigured();

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'redirect_uri' => $this->redirectUri(),
            'grant_type' => 'authorization_code',
        ]);

        return $this->parseTokenResponse($response->throw());
    }

    /**
     * @return array{
     *   access_token: string,
     *   refresh_token: string|null,
     *   expires_in: int|null,
     *   token_type: string|null,
     *   scope: string|null
     * }
     */
    public function refreshAccessToken(string $refreshToken): array
    {
        $this->assertConfigured();

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'refresh_token' => $refreshToken,
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'grant_type' => 'refresh_token',
        ]);

        return $this->parseTokenResponse($response->throw());
    }

    /**
     * @return array{id: string, summary: string, timeZone: string|null}
     */
    public function fetchPrimaryCalendar(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->get('https://www.googleapis.com/calendar/v3/calendars/primary');

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException(
                'プライマリカレンダー情報の取得に失敗しました。',
                previous: $exception,
            );
        }

        $id = $response->json('id');
        $summary = $response->json('summary');

        if (! is_string($id) || $id === '') {
            throw new RuntimeException('プライマリカレンダーIDを取得できませんでした。');
        }

        return [
            'id' => $id,
            'summary' => is_string($summary) && $summary !== '' ? $summary : 'Googleカレンダー',
            'timeZone' => is_string($response->json('timeZone')) ? $response->json('timeZone') : null,
        ];
    }

    public function fetchAccountEmail(string $accessToken): ?string
    {
        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->get('https://openidconnect.googleapis.com/v1/userinfo');

        if (! $response->successful()) {
            return null;
        }

        $email = $response->json('email');

        return is_string($email) && $email !== '' ? $email : null;
    }

    public function newState(): string
    {
        return Str::random(48);
    }

    private function clientId(): string
    {
        return (string) config('services.google.client_id', '');
    }

    private function clientSecret(): string
    {
        return (string) config('services.google.client_secret', '');
    }

    private function assertConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException(
                'Google OAuth が未設定です。GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を設定してください。',
            );
        }
    }

    /**
     * @return array{
     *   access_token: string,
     *   refresh_token: string|null,
     *   expires_in: int|null,
     *   token_type: string|null,
     *   scope: string|null
     * }
     */
    private function parseTokenResponse(\Illuminate\Http\Client\Response $response): array
    {
        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException(
                'Googleのトークン取得に失敗しました。クライアント設定とリダイレクトURIを確認してください。',
                previous: $exception,
            );
        }

        $accessToken = $response->json('access_token');
        if (! is_string($accessToken) || $accessToken === '') {
            throw new RuntimeException('Googleから access_token を受け取れませんでした。');
        }

        $refresh = $response->json('refresh_token');
        $expiresIn = $response->json('expires_in');

        return [
            'access_token' => $accessToken,
            'refresh_token' => is_string($refresh) && $refresh !== '' ? $refresh : null,
            'expires_in' => is_numeric($expiresIn) ? (int) $expiresIn : null,
            'token_type' => is_string($response->json('token_type')) ? $response->json('token_type') : null,
            'scope' => is_string($response->json('scope')) ? $response->json('scope') : null,
        ];
    }
}
