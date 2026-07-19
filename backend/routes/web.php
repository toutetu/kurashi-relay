<?php

use App\Http\Controllers\Web\FamilyTokenController;
use App\Http\Controllers\Web\InertiaPageController;
use App\Http\Controllers\Web\LegacyInertiaRedirectController;
use App\Http\Controllers\Web\RecordsController;
use App\Support\InertiaPath;
use Illuminate\Support\Facades\Route;

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
    Route::get('/mama-kaji', [InertiaPageController::class, 'mamaKaji'])->name('mama-kaji');
    Route::get('/mama-kaji/zukan', [InertiaPageController::class, 'mamaKajiZukan'])->name('mama-kaji.zukan');
    Route::get('/child-plan', [InertiaPageController::class, 'childPlan'])->name('child-plan');
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

$registerFamilyTokenRoutes = function () {
    Route::get('/family-token', [FamilyTokenController::class, 'show'])->name('show');
    Route::post('/family-token', [FamilyTokenController::class, 'store'])->name('store');
};

$inertiaRoutePrefix = InertiaPath::routePrefix();
$inertiaAppRoutes = Route::middleware(['inertia.enabled', 'web.family-token'])->name('inertia.');
$familyTokenRoutes = Route::middleware(['inertia.enabled'])->name('inertia.family-token.');

if ($inertiaRoutePrefix !== null) {
    $inertiaAppRoutes->prefix($inertiaRoutePrefix);
    $familyTokenRoutes->prefix($inertiaRoutePrefix);
}

$inertiaAppRoutes->group($registerInertiaAppRoutes);
$familyTokenRoutes->group($registerFamilyTokenRoutes);
