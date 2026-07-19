<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

final class EnsureFamilyToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS') || $request->is('api/health')) {
            return $next($request);
        }

        $expectedToken = (string) config('kurashi.family_token', '');
        if ($expectedToken === '') {
            return $this->errorResponse(
                'APIのアクセス保護が設定されていません。',
                Response::HTTP_SERVICE_UNAVAILABLE,
            );
        }

        $providedToken = (string) $request->header('X-Family-Token', '');
        $limiterKey = $this->limiterKey($request);

        if ($providedToken !== '' && hash_equals($expectedToken, $providedToken)) {
            RateLimiter::clear($limiterKey);

            return $next($request);
        }

        if (
            $request->hasSession()
            && $request->session()->get('family_token_verified') === true
        ) {
            return $next($request);
        }

        $maxAttempts = max(1, (int) config('kurashi.family_token_max_attempts', 5));
        $decaySeconds = max(1, (int) config('kurashi.family_token_decay_seconds', 60));

        if (RateLimiter::tooManyAttempts($limiterKey, $maxAttempts)) {
            $retryAfter = RateLimiter::availableIn($limiterKey);

            return $this->errorResponse(
                '試行回数が多すぎます。しばらく待ってからお試しください。',
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $retryAfter],
            );
        }

        RateLimiter::hit($limiterKey, $decaySeconds);

        return $this->errorResponse(
            'あいことばを確認してください。',
            Response::HTTP_UNAUTHORIZED,
        );
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function errorResponse(string $message, int $status, array $headers = []): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $message,
            'errors' => (object) [],
        ], $status, $headers);
    }

    private function limiterKey(Request $request): string
    {
        return 'family-token:'.hash('sha256', $request->ip() ?? 'unknown');
    }
}
