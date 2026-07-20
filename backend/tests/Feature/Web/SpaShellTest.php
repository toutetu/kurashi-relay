<?php

namespace Tests\Feature\Web;

use Tests\TestCase;

class SpaShellTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_spa_serves_shell_for_nested_direct_url(): void
    {
        $this->get('/records/musume')
            ->assertOk()
            ->assertSee('id="root"', false)
            ->assertSee('<title>くらしリレー</title>', false)
            ->assertDontSee('@inertia', false);
    }

    public function test_spa_serves_shell_for_unknown_path(): void
    {
        $this->get('/not-found')
            ->assertOk()
            ->assertSee('id="root"', false);
    }

    public function test_spa_keeps_api_not_found_as_json(): void
    {
        $this->getJson('/api/not-found')
            ->assertNotFound()
            ->assertJson([
                'status' => 'error',
                'message' => 'エンドポイントが見つかりません。',
            ]);
    }

    public function test_spa_does_not_capture_build_prefix(): void
    {
        $this->get('/build/missing-asset.js')
            ->assertNotFound();
    }

    public function test_spa_preserves_legacy_app_bookmark_redirect(): void
    {
        $this->get('/app/records?date=2026-07-20')
            ->assertRedirect('/records?date=2026-07-20');
    }
}
