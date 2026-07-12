<?php

namespace App\Services;

use App\Data\DashboardFixture;

final class DashboardService
{
    private const BASE_DATE = '2026-07-12';

    public function __construct(
        private readonly DashboardFixture $fixture,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function get(?string $date = null): array
    {
        return $this->fixture->forDate($date ?? self::BASE_DATE);
    }
}
