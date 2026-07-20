<?php

namespace Tests\Feature\Web;

use Tests\TestCase;

class SpaShellTest extends TestCase
{
    private function bootWithFrontendMode(string $mode): void
    {
        putenv('FRONTEND_MODE='.$mode);
        $_ENV['FRONTEND_MODE'] = $mode;
        $_SERVER['FRONTEND_MODE'] = $mode;

        $this->refreshApplication();
        $this->withoutVite();
    }

    protected function tearDown(): void
    {
        putenv('FRONTEND_MODE');
        unset($_ENV['FRONTEND_MODE'], $_SERVER['FRONTEND_MODE']);

        parent::tearDown();
    }

    public function test_spa_mode_serves_shell_for_nested_direct_url(): void
    {
        $this->bootWithFrontendMode('spa');

        $this->get('/records/musume')
            ->assertOk()
            ->assertSee('id="root"', false)
            ->assertSee('<title>くらしリレー</title>', false)
            ->assertDontSee('@inertia', false);
    }

    public function test_spa_mode_serves_shell_for_unknown_path(): void
    {
        $this->bootWithFrontendMode('spa');

        $this->get('/not-found')
            ->assertOk()
            ->assertSee('id="root"', false);
    }

    public function test_spa_mode_keeps_api_not_found_as_json(): void
    {
        $this->bootWithFrontendMode('spa');

        $this->getJson('/api/not-found')
            ->assertNotFound()
            ->assertJson([
                'status' => 'error',
                'message' => 'エンドポイントが見つかりません。',
            ]);
    }

    public function test_spa_mode_does_not_capture_build_prefix(): void
    {
        $this->bootWithFrontendMode('spa');

        $this->get('/build/missing-asset.js')
            ->assertNotFound();
    }

    public function test_spa_mode_preserves_legacy_app_bookmark_redirect(): void
    {
        $this->bootWithFrontendMode('spa');

        $this->get('/app/records?date=2026-07-20')
            ->assertRedirect('/records?date=2026-07-20');
    }

    public function test_inertia_mode_keeps_prefixed_home_route(): void
    {
        $this->bootWithFrontendMode('inertia');

        config([
            'kurashi.inertia.enabled' => true,
            'kurashi.family_token' => 'test-family-token',
        ]);

        $this->withFamilyToken()
            ->get('/app')
            ->assertOk();
    }
}
