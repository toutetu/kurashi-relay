<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\Koekake\CompletionController;
use App\Http\Controllers\Api\Koekake\KoekakeTaskController;
use App\Http\Controllers\Api\Koekake\MusumeSummaryController;
use App\Http\Controllers\Api\Koekake\PromptEventController;
use App\Http\Controllers\Api\Koekake\SnoozeController;
use App\Http\Controllers\Api\Musume\PlanController;
use App\Http\Controllers\Api\PlannedActivityController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskRecordController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::middleware('family-token')->group(function () {
    Route::get('/dashboard', DashboardController::class);

    Route::get('/tasks', [TaskController::class, 'index']);
    Route::get('/task-records', [TaskRecordController::class, 'index']);
    Route::post('/task-records', [TaskRecordController::class, 'store']);
    Route::delete('/task-records/{id}', [TaskRecordController::class, 'destroy'])->whereNumber('id');
    Route::get('/rewards/summary', [RewardController::class, 'summary']);
    Route::get('/rewards/collections', [RewardController::class, 'collections']);

    Route::get('/planned-activities/options', [PlannedActivityController::class, 'options']);
    Route::get('/planned-activities', [PlannedActivityController::class, 'index']);
    Route::post('/planned-activities', [PlannedActivityController::class, 'store']);
    Route::patch('/planned-activities/{id}', [PlannedActivityController::class, 'update'])->whereNumber('id');
    Route::delete('/planned-activities/{id}', [PlannedActivityController::class, 'destroy'])->whereNumber('id');

    Route::prefix('musume')->group(function () {
        Route::get('/plan', [PlanController::class, 'show']);
        Route::patch('/plan/{id}', [PlanController::class, 'update'])->whereNumber('id');
        Route::put('/plan/{id}/items', [PlanController::class, 'replaceItems'])->whereNumber('id');
        Route::post('/plan/{id}/reflection/complete', [PlanController::class, 'completeReflection'])->whereNumber('id');
    });

    Route::prefix('koekake')->group(function () {
        Route::get('/musume-summary', [MusumeSummaryController::class, 'show']);
        Route::get('/tasks', [KoekakeTaskController::class, 'index']);
        Route::get('/tasks/{id}', [KoekakeTaskController::class, 'show'])->whereNumber('id');
        Route::post('/prompt-events', [PromptEventController::class, 'store']);
        Route::delete('/prompt-events/{id}', [PromptEventController::class, 'destroy'])->whereNumber('id');
        Route::patch('/tasks/{id}/completion', [CompletionController::class, 'update'])->whereNumber('id');
        Route::post('/tasks/{id}/snooze', [SnoozeController::class, 'store'])->whereNumber('id');
    });
});
