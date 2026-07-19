<?php

namespace App\Support;

final class InertiaPath
{
    public static function enabled(): bool
    {
        return (bool) config('kurashi.inertia.enabled', false);
    }

    public static function cutover(): bool
    {
        return self::enabled() && (bool) config('kurashi.inertia.cutover', false);
    }

    /**
     * Route segment for Route::prefix(), or null when served from the site root.
     */
    public static function routePrefix(): ?string
    {
        if (self::cutover()) {
            return null;
        }

        $prefix = (string) config('kurashi.inertia.path_prefix', 'app');

        return $prefix === '' ? null : $prefix;
    }

    /**
     * URL path prefix including a leading slash, or an empty string at the site root.
     */
    public static function urlPrefix(): string
    {
        $routePrefix = self::routePrefix();

        return $routePrefix === null ? '' : '/'.$routePrefix;
    }

    /**
     * Prefix value shared with the Inertia frontend. Empty string at cutover.
     */
    public static function sharedPrefix(): string
    {
        if (! self::enabled()) {
            return (string) config('kurashi.inertia.path_prefix', 'app');
        }

        if (self::cutover()) {
            return '';
        }

        return (string) config('kurashi.inertia.path_prefix', 'app');
    }

    public static function toUrl(string $path = '/'): string
    {
        $normalized = $path === '' || $path === '/' ? '/' : '/'.ltrim($path, '/');
        $prefix = self::urlPrefix();

        if ($prefix === '') {
            return $normalized;
        }

        return $normalized === '/' ? $prefix : $prefix.$normalized;
    }

    public static function legacyUrlPrefix(): string
    {
        $legacy = (string) config('kurashi.inertia.legacy_path_prefix', 'app');

        return $legacy === '' ? '/app' : '/'.$legacy;
    }
}
