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
        $oauthReady = $service->isGoogleApiConfigured();

        return (new CalendarConnectionResource($result['connection']))
            ->additional([
                'status' => 'success',
                'meta' => [
                    'oauth_url' => $result['oauth_url'],
                    'message' => $oauthReady
                        ? 'カレンダー接続を保存しました。同期するとGoogleから予定を取り込みます。'
                        : 'カレンダー接続を保存しました。アクセストークン未設定のため、同期時は確認用サンプルを取り込みます。',
                ],
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function sync(int $id, CalendarConnectionService $service): JsonResponse
    {
        $date = request()->query('date');
        $localDate = is_string($date) && $date !== '' ? $date : null;

        try {
            $result = $service->sync($id, $localDate);
        } catch (\RuntimeException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
                'errors' => (object) [],
            ], 502);
        }

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }
}
