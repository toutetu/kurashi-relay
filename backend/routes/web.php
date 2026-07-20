<?php

use App\Http\Controllers\Web\SpaController;
use App\Http\Controllers\Web\SpaLegacyRedirectController;
use Illuminate\Support\Facades\Route;

// /app/* bookmarks keep working and land on SPA root URLs with query string preserved.
Route::get('/app/{path?}', SpaLegacyRedirectController::class)
    ->where('path', '.*')
    ->name('spa.legacy');

Route::match(['get', 'head'], '/{path?}', SpaController::class)
    ->where('path', '(?!api(?:/|$)|build(?:/|$)|storage(?:/|$)|sanctum(?:/|$)).*')
    ->name('spa');
