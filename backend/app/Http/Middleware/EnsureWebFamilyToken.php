<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

final class EnsureWebFamilyToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('inertia.family-token.*')) {
            return $next($request);
        }

        $expectedToken = (string) config('kurashi.family_token', '');
        if ($expectedToken === '') {
            abort(Response::HTTP_SERVICE_UNAVAILABLE, 'アクセス保護が設定されていません。');
        }

        if ($request->session()->get('family_token_verified') === true) {
            return $next($request);
        }

        $providedToken = (string) $request->header('X-Family-Token', '');
        if ($providedToken !== '' && hash_equals($expectedToken, $providedToken)) {
            $request->session()->put('family_token_verified', true);
            RateLimiter::clear($this->limiterKey($request));

            return $next($request);
        }

        return redirect()->guest(route('inertia.family-token.show'));
    }

    private function limiterKey(Request $request): string
    {
        return 'family-token-web:'.hash('sha256', $request->ip() ?? 'unknown');
    }
}
