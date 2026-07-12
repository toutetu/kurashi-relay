<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_service_status(): void
    {
        $response = $this->getJson('/api/health');

        $response
            ->assertOk()
            ->assertExactJson([
                'status' => 'success',
                'data' => [
                    'service' => 'kurashi-relay-api',
                ],
            ]);
    }

    public function test_health_endpoint_allows_the_frontend_origin(): void
    {
        $response = $this
            ->withHeader('Origin', 'http://localhost:5173')
            ->getJson('/api/health');

        $response
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function test_cors_preflight_allows_the_configured_frontend_origin(): void
    {
        $this
            ->withHeaders([
                'Origin' => 'http://localhost:5173',
                'Access-Control-Request-Method' => 'GET',
            ])
            ->options('/api/dashboard')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function test_health_endpoint_allows_the_loopback_frontend_origin(): void
    {
        $this
            ->withHeader('Origin', 'http://127.0.0.1:5173')
            ->getJson('/api/health')
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
    }

    public function test_cors_does_not_echo_an_unconfigured_origin(): void
    {
        $this
            ->withHeader('Origin', 'https://example.invalid')
            ->getJson('/api/health')
            ->assertOk()
            ->assertHeaderMissing('Access-Control-Allow-Origin')
            ->assertHeaderMissing('Access-Control-Allow-Credentials');
    }
}
