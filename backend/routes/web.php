<?php

use App\Http\Controllers\Web\InertiaPageController;
use App\Http\Controllers\Web\LegacyInertiaRedirectController;
use App\Http\Controllers\Web\RecordsController;
use App\Http\Controllers\Web\SpaController;
use App\Http\Controllers\Web\SpaLegacyRedirectController;
use App\Support\FrontendMode;
use App\Support\InertiaPath;
use Illuminate\Support\Facades\Route;

$frontendMode = FrontendMode::current();

if ($frontendMode === FrontendMode::SPA) {
    // /app/* bookmarks keep working and land on SPA root URLs with query string preserved.
    Route::get(InertiaPath::legacyUrlPrefix().'/{path?}', SpaLegacyRedirectController::class)
        ->where('path', '.*')
        ->name('spa.legacy');

    Route::match(['get', 'head'], '/{path?}', SpaController::class)
        ->where('path', '(?!api(?:/|$)|build(?:/|$)|storage(?:/|$)|sanctum(?:/|$)).*')
        ->name('spa');

    return;
}

if (InertiaPath::cutover()) {
    Route::middleware(['inertia.enabled'])
        ->get(InertiaPath::legacyUrlPrefix().'/{path?}', LegacyInertiaRedirectController::class)
        ->where('path', '.*')
        ->name('inertia.legacy');
}

$registerInertiaAppRoutes = function () {
    Route::get('/', [InertiaPageController::class, 'home'])->name('home');
    Route::get('/schedule-comparison', [InertiaPageController::class, 'scheduleComparison'])->name('schedule-comparison');
    Route::get('/schedule', [InertiaPageController::class, 'schedule'])->name('schedule');
    Route::get('/records', [RecordsController::class, 'index'])->name('records.index');
    Route::get('/records/musume', [RecordsController::class, 'musume'])->name('records.musume');
    Route::get('/mama-kaji', [InertiaPageController::class, 'mamaKaji'])->name('mama-kaji');
    Route::get('/mama-kaji/zukan', [InertiaPageController::class, 'mamaKajiZukan'])->name('mama-kaji.zukan');
    Route::get('/child-plan', [InertiaPageController::class, 'childPlan'])->name('child-plan');
    Route::get('/mama-state', [InertiaPageController::class, 'mamaState'])->name('mama-state');
    Route::get('/musume', [InertiaPageController::class, 'musume'])->name('musume');
    Route::get('/koekake', [InertiaPageController::class, 'koekake'])->name('koekake');
    Route::get('/oshigoto', [InertiaPageController::class, 'oshigoto'])->name('oshigoto');
    Route::get('/oshigoto/zukan', [InertiaPageController::class, 'oshigotoZukan'])->name('oshigoto.zukan');
    Route::get('/oshigoto/usj', [InertiaPageController::class, 'oshigotoUsj'])->name('oshigoto.usj');
    Route::get('/summary', [InertiaPageController::class, 'summary'])->name('summary');
    Route::get('/last-war', [InertiaPageController::class, 'lastWar'])->name('last-war');
    Route::get('/support', [InertiaPageController::class, 'support'])->name('support');
    Route::get('/reports', [InertiaPageController::class, 'reports'])->name('reports');
    Route::get('/settings', [InertiaPageController::class, 'settings'])->name('settings');
};

$inertiaRoutePrefix = InertiaPath::routePrefix();
$inertiaAppRoutes = Route::middleware(['inertia.enabled'])->name('inertia.');

if ($inertiaRoutePrefix !== null) {
    $inertiaAppRoutes->prefix($inertiaRoutePrefix);
}

$inertiaAppRoutes->group($registerInertiaAppRoutes);
