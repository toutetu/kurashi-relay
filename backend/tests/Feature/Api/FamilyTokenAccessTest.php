<?php

namespace Tests\Feature\Api;

use App\Models\TaskRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class FamilyTokenAccessTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-family-token';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->clearFamilyTokenRateLimit();
    }

    public function test_health_allows_requests_without_token(): void
    {
        $this->withoutFamilyToken()
            ->getJson('/api/health')
            ->assertOk()
            ->assertExactJson([
                'status' => 'success',
                'data' => [
                    'service' => 'kurashi-relay-api',
                ],
            ]);
    }

    public function test_protected_get_without_token_returns_401(): void
    {
        $this->withoutFamilyToken()
            ->getJson('/api/dashboard')
            ->assertUnauthorized()
            ->assertExactJson($this->unauthorizedPayload());
    }

    public function test_protected_post_without_token_returns_401_and_does_not_create_records(): void
    {
        $beforeCount = TaskRecord::query()->count();

        $this->withoutFamilyToken()
            ->postJson('/api/task-records', [
                'member' => 'child',
                'task' => 'shokki',
                'date' => '2026-07-16',
                'idempotency_key' => 'family-token-missing',
            ])
            ->assertUnauthorized()
            ->assertExactJson($this->unauthorizedPayload());

        $this->assertSame($beforeCount, TaskRecord::query()->count());
    }

    public function test_protected_api_rejects_invalid_token(): void
    {
        $this->withInvalidFamilyToken()
            ->getJson('/api/dashboard')
            ->assertUnauthorized()
            ->assertExactJson($this->unauthorizedPayload());
    }

    public function test_protected_api_allows_valid_token(): void
    {
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('status', 'success');
    }

    public function test_protected_api_returns_503_when_family_token_is_not_configured(): void
    {
        config(['kurashi.family_token' => '']);

        $this->withFamilyToken(self::TOKEN)
            ->getJson('/api/dashboard')
            ->assertStatus(503)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'APIのアクセス保護が設定されていません。')
            ->assertJsonPath('errors', []);
    }

    public function test_invalid_attempts_return_401_until_limit_then_429_with_retry_after(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->withInvalidFamilyToken()
                ->getJson('/api/dashboard')
                ->assertUnauthorized()
                ->assertExactJson($this->unauthorizedPayload());
        }

        $this->withInvalidFamilyToken()
            ->getJson('/api/dashboard')
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', '試行回数が多すぎます。しばらく待ってからお試しください。')
            ->assertJsonPath('errors', []);
    }

    public function test_valid_token_succeeds_after_failed_attempts_and_clears_rate_limit(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->withInvalidFamilyToken()
                ->getJson('/api/dashboard')
                ->assertUnauthorized();
        }

        $this->withFamilyToken(self::TOKEN)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->withFamilyToken(self::TOKEN)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('status', 'success');
    }

    public function test_rate_limit_contract_resets_after_valid_token(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->withInvalidFamilyToken()
                ->getJson('/api/dashboard')
                ->assertUnauthorized()
                ->assertExactJson($this->unauthorizedPayload());
        }

        $this->withInvalidFamilyToken()
            ->getJson('/api/dashboard')
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', '試行回数が多すぎます。しばらく待ってからお試しください。')
            ->assertJsonPath('errors', []);

        $this->withFamilyToken(self::TOKEN)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->withFamilyToken(self::TOKEN)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('status', 'success');
    }

    public function test_cors_preflight_allows_x_family_token_header_without_token(): void
    {
        $response = $this
            ->withoutFamilyToken()
            ->withHeaders([
                'Origin' => 'http://localhost:5173',
                'Access-Control-Request-Method' => 'GET',
                'Access-Control-Request-Headers' => 'X-Family-Token',
            ])
            ->options('/api/dashboard');

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

        $allowedHeaders = (string) $response->headers->get('Access-Control-Allow-Headers');

        $this->assertTrue(
            $allowedHeaders === '*' || str_contains(strtolower($allowedHeaders), 'x-family-token'),
            'Expected X-Family-Token to be allowed in CORS preflight.',
        );
    }

    /**
     * @return array{status: string, message: string, errors: array<string, mixed>}
     */
    private function unauthorizedPayload(): array
    {
        return [
            'status' => 'error',
            'message' => 'あいことばを確認してください。',
            'errors' => [],
        ];
    }

    private function clearFamilyTokenRateLimit(): void
    {
        RateLimiter::clear('family-token:'.hash('sha256', '127.0.0.1'));
    }
}
