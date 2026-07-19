<?php

namespace Tests\Feature\Web;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InertiaFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        config([
            'kurashi.inertia.enabled' => true,
            'kurashi.family_token' => 'test-family-token',
        ]);
    }

    public function test_inertia_routes_return_not_found_when_disabled(): void
    {
        config(['kurashi.inertia.enabled' => false]);

        $this->withFamilyToken()
            ->get('/app')
            ->assertNotFound();
    }

    public function test_inertia_home_renders_welcome_page(): void
    {
        $this->withFamilyToken()
            ->get('/app')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Welcome')
                ->has('recordsPath')
            );
    }

    public function test_inertia_routes_redirect_to_family_token_page_without_session(): void
    {
        $this->withoutFamilyToken()
            ->get('/app')
            ->assertRedirect('/app/family-token');
    }

    public function test_unauthenticated_inertia_visits_do_not_rate_limit_before_token_entry(): void
    {
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->withoutFamilyToken()
                ->get('/app')
                ->assertRedirect('/app/family-token');
        }
    }

    public function test_family_token_store_rejects_invalid_token_with_validation_error(): void
    {
        $this->post('/app/family-token', [
            'token' => 'wrong-token',
        ])
            ->assertRedirect()
            ->assertSessionHasErrors('token');
    }

    public function test_family_token_page_renders_form(): void
    {
        $this->get('/app/family-token')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/FamilyToken')
                ->has('intendedUrl')
            );
    }

    public function test_family_token_store_accepts_valid_token_and_redirects_home(): void
    {
        $this->post('/app/family-token', [
            'token' => 'test-family-token',
        ])->assertRedirect('/app');

        $this->assertTrue(session('family_token_verified'));
    }
}
