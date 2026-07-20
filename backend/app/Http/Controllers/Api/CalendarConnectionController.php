<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCalendarConnectionRequest;
use App\Http\Resources\CalendarConnectionResource;
use App\Services\CalendarConnectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CalendarConnectionController extends Controller
{
    public function index(CalendarConnectionService $service): AnonymousResourceCollection
    {
        return CalendarConnectionResource::collection($service->list())
            ->additional(['status' => 'success']);
    }

    public function store(
        StoreCalendarConnectionRequest $request,
        CalendarConnectionService $service,
    ): JsonResponse {
        $result = $service->createPlaceholder($request->validated());

        return (new CalendarConnectionResource($result['connection']))
            ->additional([
                'status' => 'success',
                'meta' => [
                    'oauth_url' => $result['oauth_url'],
                    'message' => 'Googleカレンダーは準備中です。表示名だけ保存しました。',
                ],
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function sync(int $id, CalendarConnectionService $service): JsonResponse
    {
        $result = $service->sync($id);

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }
}
