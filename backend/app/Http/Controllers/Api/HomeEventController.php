<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHomeEventRequest;
use App\Http\Requests\UpsertHomeConditionRequest;
use App\Http\Resources\ActivityEventResource;
use App\Http\Resources\DailyConditionResource;
use App\Services\HomeEventService;
use App\Support\JstDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class HomeEventController extends Controller
{
    public function store(
        StoreHomeEventRequest $request,
        HomeEventService $service,
    ): JsonResponse {
        $result = $service->store($request->validated());

        return (new ActivityEventResource($result['event']))
            ->additional([
                'status' => 'success',
                'meta' => ['created' => $result['created']],
            ])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }

    public function destroy(int $id, HomeEventService $service): ActivityEventResource
    {
        $event = $service->cancel($id);

        return (new ActivityEventResource($event))->additional(['status' => 'success']);
    }

    public function quickLogs(Request $request, HomeEventService $service): JsonResponse
    {
        $date = $request->query('date');
        $resolved = is_string($date) && $date !== '' ? $date : JstDate::today();

        return response()->json([
            'status' => 'success',
            'data' => $service->quickLogCounts($resolved),
            'meta' => ['date' => $resolved, 'timezone' => 'Asia/Tokyo'],
        ]);
    }

    public function showConditions(Request $request, HomeEventService $service): JsonResponse
    {
        $date = $request->query('date');
        $resolved = is_string($date) && $date !== '' ? $date : JstDate::today();
        $condition = $service->conditionsForDate($resolved);

        return response()->json([
            'status' => 'success',
            'data' => $condition !== null
                ? (new DailyConditionResource($condition))->resolve()
                : null,
            'meta' => ['date' => $resolved],
        ]);
    }

    public function upsertConditions(
        UpsertHomeConditionRequest $request,
        HomeEventService $service,
    ): DailyConditionResource {
        $condition = $service->upsertConditions($request->validated());

        return (new DailyConditionResource($condition))->additional(['status' => 'success']);
    }
}
