<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\Koekake\CompletionController;
use App\Http\Controllers\Api\Koekake\KoekakeTaskController;
use App\Http\Controllers\Api\Koekake\PromptEventController;
use App\Http\Controllers\Api\Koekake\SnoozeController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskRecordController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/dashboard', DashboardController::class);

Route::get('/tasks', [TaskController::class, 'index']);
Route::post('/task-records', [TaskRecordController::class, 'store']);
Route::delete('/task-records/{id}', [TaskRecordController::class, 'destroy'])->whereNumber('id');
Route::get('/rewards/summary', [RewardController::class, 'summary']);
Route::get('/rewards/collections', [RewardController::class, 'collections']);

Route::prefix('koekake')->group(function () {
    Route::get('/tasks', [KoekakeTaskController::class, 'index']);
    Route::get('/tasks/{id}', [KoekakeTaskController::class, 'show'])->whereNumber('id');
    Route::post('/prompt-events', [PromptEventController::class, 'store']);
    Route::delete('/prompt-events/{id}', [PromptEventController::class, 'destroy'])->whereNumber('id');
    Route::patch('/tasks/{id}/completion', [CompletionController::class, 'update'])->whereNumber('id');
    Route::post('/tasks/{id}/snooze', [SnoozeController::class, 'store'])->whereNumber('id');
});
