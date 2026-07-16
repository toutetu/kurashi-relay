<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HealthController;
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
