<?php

namespace Database\Support;

use Carbon\CarbonInterface;

final class ActivityEventCancellationGuard
{
    /**
     * SQLite tests lack a cross-table DB trigger; PostgreSQL enforces via trigger.
     * Application write services must call this before persisting cancellations.
     */
    public static function assertCancelledAtNotBeforeOccurredAt(CarbonInterface $cancelledAt, CarbonInterface $occurredAt): void
    {
        if ($cancelledAt->lt($occurredAt)) {
            throw new \InvalidArgumentException(
                'cancelled_at must be greater than or equal to activity_events.occurred_at'
            );
        }
    }
}
