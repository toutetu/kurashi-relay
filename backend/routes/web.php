<?php

use App\Http\Controllers\Web\FamilyTokenController;
use App\Http\Controllers\Web\InertiaHomeController;
use App\Http\Controllers\Web\RecordsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['inertia.enabled', 'web.family-token'])
    ->prefix(config('kurashi.inertia.path_prefix', 'app'))
    ->name('inertia.')
    ->group(function () {
        Route::get('/', InertiaHomeController::class)->name('home');
        Route::get('/records', [RecordsController::class, 'index'])->name('records.index');
    });

Route::middleware(['inertia.enabled'])
    ->prefix(config('kurashi.inertia.path_prefix', 'app'))
    ->name('inertia.family-token.')
    ->group(function () {
        Route::get('/family-token', [FamilyTokenController::class, 'show'])->name('show');
        Route::post('/family-token', [FamilyTokenController::class, 'store'])->name('store');
    });
