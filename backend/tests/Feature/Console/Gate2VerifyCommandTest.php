<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Gate2VerifyCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_gate2_verify_passes_on_fresh_seeded_sqlite_database(): void
    {
        $exitCode = Artisan::call('gate2:verify');

        $this->assertSame(0, $exitCode);
        $output = Artisan::output();
        $this->assertStringContainsString('Gate 2 verify summary: pass=', $output);
        $this->assertStringContainsString('fail=0', $output);
        $this->assertStringContainsString('[SKIP] postgresql check:', $output);
    }

    public function test_gate2_verify_fails_when_seed_count_does_not_match(): void
    {
        $this->assertSame(0, Artisan::call('gate2:verify'));

        DB::table('family_members')->insert([
            'role' => 'test_observer',
            'display_name' => '検証用',
            'created_at' => now('UTC'),
            'updated_at' => now('UTC'),
        ]);

        $exitCode = Artisan::call('gate2:verify');

        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('seed count mismatch: family_members', $output);
        $this->assertMatchesRegularExpression('/Gate 2 verify summary: pass=\d+ fail=[1-9]\d* skip=\d+/', $output);
    }
}
