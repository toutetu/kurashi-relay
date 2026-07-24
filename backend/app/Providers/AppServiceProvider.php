<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ポート違い(8000/8001)でも、開いているホストと同じ場所から JS/CSS を読む
        if (! $this->app->runningInConsole() && ! $this->app->runningUnitTests()) {
            $request = request();
            if ($request !== null) {
                URL::forceRootUrl($request->getSchemeAndHttpHost());
            }
        }
    }
}
