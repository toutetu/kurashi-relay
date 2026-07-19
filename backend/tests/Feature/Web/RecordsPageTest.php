<?php

namespace Tests\Feature\Web;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecordsPageTest extends TestCase
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

        $this->seed();
    }

    public function test_records_page_renders_member_payloads_for_selected_date(): void
    {
        $this->withFamilyToken()
            ->get('/app/records?date=2026-07-19')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Records/Index')
                ->where('date', '2026-07-19')
                ->has('child.tasks')
                ->has('mother.tasks')
                ->has('child.summary.today_done_count')
                ->has('mother.summary.today_done_count')
            );
    }
}
