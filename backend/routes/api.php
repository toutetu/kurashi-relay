<?php

use App\Http\Controllers\Api\CalendarConnectionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FamilySettingController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\HomeEventController;
use App\Http\Controllers\Api\Koekake\CompletionController;
use App\Http\Controllers\Api\Koekake\KoekakeTaskController;
use App\Http\Controllers\Api\Koekake\MusumeSummaryController;
use App\Http\Controllers\Api\Koekake\PromptEventController;
use App\Http\Controllers\Api\Koekake\SnoozeController;
use App\Http\Controllers\Api\Musume\PlanController;
use App\Http\Controllers\Api\PlanActualLinkController;
use App\Http\Controllers\Api\PlannedActivityController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\ScheduleComparisonController;
use App\Http\Controllers\Api\SharedReportController;
use App\Http\Controllers\Api\SupportHandoverController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskRecordController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/shared-reports/{token}', [SharedReportController::class, 'show']);

Route::middleware('family-token')->group(function () {
    Route::get('/dashboard', DashboardController::class);

    Route::post('/home/events', [HomeEventController::class, 'store']);
    Route::patch('/home/events/{id}/complete', [HomeEventController::class, 'complete'])->whereNumber('id');
    Route::patch('/home/events/{id}', [HomeEventController::class, 'update'])->whereNumber('id');
    Route::delete('/home/events/{id}', [HomeEventController::class, 'destroy'])->whereNumber('id');
    Route::post('/home/plans/{id}/skip', [HomeEventController::class, 'skipPlan'])->whereNumber('id');
    Route::get('/home/quick-logs', [HomeEventController::class, 'quickLogs']);
    Route::get('/home/conditions', [HomeEventController::class, 'showConditions']);
    Route::put('/home/conditions', [HomeEventController::class, 'upsertConditions']);

    Route::get('/schedule-comparisons', ScheduleComparisonController::class);

    Route::get('/support-handovers', [SupportHandoverController::class, 'index']);
    Route::post('/support-handovers', [SupportHandoverController::class, 'store']);
    Route::patch('/support-handovers/{id}', [SupportHandoverController::class, 'update'])->whereNumber('id');
    Route::delete('/support-handovers/{id}', [SupportHandoverController::class, 'destroy'])->whereNumber('id');

    Route::get('/reports', [ReportController::class, 'index']);
    Route::post('/reports', [ReportController::class, 'store']);
    Route::post('/reports/{id}/share', [ReportController::class, 'share'])->whereNumber('id');

    Route::get('/settings/family', [FamilySettingController::class, 'show']);
    Route::put('/settings/family', [FamilySettingController::class, 'update']);

    Route::get('/calendar-connections', [CalendarConnectionController::class, 'index']);
    Route::post('/calendar-connections', [CalendarConnectionController::class, 'store']);
    Route::get('/calendar-connections/oauth/start', [CalendarConnectionController::class, 'oauthStart']);
    Route::get('/calendar-connections/{id}/calendars', [CalendarConnectionController::class, 'calendars'])->whereNumber('id');
    Route::patch('/calendar-connections/{id}/calendar', [CalendarConnectionController::class, 'selectCalendar'])->whereNumber('id');
    Route::post('/calendar-connections/{id}/sync', [CalendarConnectionController::class, 'sync'])->whereNumber('id');
    Route::delete('/calendar-connections/{id}', [CalendarConnectionController::class, 'destroy'])->whereNumber('id');

    Route::post('/plan-actual-links/suggest', [PlanActualLinkController::class, 'suggest']);
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);

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
