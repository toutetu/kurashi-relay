<?php

namespace Tests\Feature\Api;

use App\Services\Gate2\Gate2MinimalSmokeRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Gate2MinimalSmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_minimal_smoke_harness_passes_after_seed(): void
    {
        $result = app(Gate2MinimalSmokeRunner::class)->run('test-family-token');

        $messages = array_map(
            static fn (array $entry): string => "[{$entry['status']}] {$entry['message']}",
            $result->entries(),
        );

        $this->assertTrue(
            $result->isSuccessful(),
            "Expected minimal smoke harness to pass.\n".implode("\n", $messages),
        );
        $this->assertGreaterThanOrEqual(4, $result->passCount());
        $this->assertSame(0, $result->failureCount());
    }
}
