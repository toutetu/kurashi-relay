<?php

namespace App\Support;

use Carbon\CarbonImmutable;

final class JstDate
{
    public const TIMEZONE = 'Asia/Tokyo';

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TIMEZONE);
    }

    public static function today(): string
    {
        return self::now()->toDateString();
    }

    public static function isFuture(string $date): bool
    {
        return $date > self::today();
    }

    public static function isTooFarInPast(string $date): bool
    {
        $oldestAllowed = self::now()->subDays((int) config('kurashi.max_record_past_days', 30))->toDateString();

        return $date < $oldestAllowed;
    }
}
