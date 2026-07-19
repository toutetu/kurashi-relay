<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureInertiaEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('kurashi.inertia.enabled', false)) {
            abort(Response::HTTP_NOT_FOUND);
        }

        return $next($request);
    }
}
