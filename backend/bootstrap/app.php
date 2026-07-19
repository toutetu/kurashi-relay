<?php

use App\Exceptions\IdempotencyConflictException;
use App\Http\Middleware\EnsureFamilyToken;
use App\Http\Middleware\EnsureInertiaEnabled;
use App\Http\Middleware\EnsureWebFamilyToken;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->api(prepend: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
        ]);

        $middleware->alias([
            'family-token' => EnsureFamilyToken::class,
            'inertia.enabled' => EnsureInertiaEnabled::class,
            'web.family-token' => EnsureWebFamilyToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $exception): bool => $request->is('api/*')
        );

        $exceptions->render(function (ValidationException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'status' => 'error',
                'message' => '入力内容を確認してください。',
                'errors' => $exception->errors(),
            ], $exception->status);
        });

        $exceptions->render(function (IdempotencyConflictException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'status' => 'error',
                'message' => '同じ idempotency_key でリクエスト内容が一致しません。',
                'errors' => (object) [],
            ], 409);
        });

        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $exception instanceof HttpExceptionInterface
                ? $exception->getStatusCode()
                : 500;

            $message = match ($status) {
                404 => 'エンドポイントが見つかりません。',
                405 => '許可されていないメソッドです。',
                default => $status >= 500
                    ? '処理中に問題が発生しました。'
                    : 'リクエストを処理できませんでした。',
            };

            $headers = $exception instanceof HttpExceptionInterface
                ? $exception->getHeaders()
                : [];

            $payload = [
                'status' => 'error',
                'message' => $message,
                'errors' => (object) [],
            ];

            return response()->json($payload, $status, $headers);
        });
    })->create();
