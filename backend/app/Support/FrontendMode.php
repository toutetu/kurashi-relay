<?php

namespace App\Support;

use InvalidArgumentException;

final class FrontendMode
{
    public const INERTIA = 'inertia';

    public const SPA = 'spa';

    /**
     * @return self::INERTIA|self::SPA
     */
    public static function current(): string
    {
        $mode = (string) config('kurashi.frontend.mode', self::INERTIA);

        if (! in_array($mode, [self::INERTIA, self::SPA], true)) {
            throw new InvalidArgumentException(
                "Invalid FRONTEND_MODE [{$mode}]. Allowed values: inertia, spa."
            );
        }

        return $mode;
    }

    public static function isSpa(): bool
    {
        return self::current() === self::SPA;
    }

    public static function isInertia(): bool
    {
        return self::current() === self::INERTIA;
    }
}
