<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\FamilyTokenStoreRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

final class FamilyTokenController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('Auth/FamilyToken', [
            'intendedUrl' => $request->session()->get('url.intended', route('inertia.home')),
        ]);
    }

    public function store(FamilyTokenStoreRequest $request): RedirectResponse
    {
        $expectedToken = (string) config('kurashi.family_token', '');
        if ($expectedToken === '') {
            abort(HttpResponse::HTTP_SERVICE_UNAVAILABLE, 'アクセス保護が設定されていません。');
        }

        $providedToken = (string) $request->validated('token');
        $limiterKey = 'family-token-web:'.hash('sha256', $request->ip() ?? 'unknown');
        $maxAttempts = max(1, (int) config('kurashi.family_token_max_attempts', 5));
        $decaySeconds = max(1, (int) config('kurashi.family_token_decay_seconds', 60));

        if (! hash_equals($expectedToken, $providedToken)) {
            if (RateLimiter::tooManyAttempts($limiterKey, $maxAttempts)) {
                return back()->withErrors([
                    'token' => '試行回数が多すぎます。しばらく待ってからお試しください。',
                ]);
            }

            RateLimiter::hit($limiterKey, $decaySeconds);

            return back()->withErrors([
                'token' => 'あいことばを確認してください。',
            ]);
        }

        RateLimiter::clear($limiterKey);
        $request->session()->put('family_token_verified', true);

        return redirect()->intended(route('inertia.home'));
    }
}
