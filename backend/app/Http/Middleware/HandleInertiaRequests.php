<?php

namespace App\Http\Middleware;

use App\Support\InertiaPath;
use Illuminate\Http\Request;
use Inertia\Middleware;

final class HandleInertiaRequests extends Middleware
{
    /**
     * @var string
     */
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name', 'くらしリレー'),
                'timezone' => config('kurashi.timezone', 'Asia/Tokyo'),
                'inertiaPrefix' => InertiaPath::sharedPrefix(),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
            ],
            'auth' => [
                'mode' => 'session',
                'verified' => true,
            ],
        ];
    }
}
