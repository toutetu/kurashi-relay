<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SelectCalendarRequest;
use App\Http\Requests\StoreCalendarConnectionRequest;
use App\Http\Resources\CalendarConnectionResource;
use App\Services\CalendarConnectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use RuntimeException;

final class CalendarConnectionController extends Controller
{
    public function index(CalendarConnectionService $service): AnonymousResourceCollection
    {
        return CalendarConnectionResource::collection($service->list())
            ->additional([
                'status' => 'success',
                'meta' => [
                    'oauth_configured' => $service->isOAuthConfigured(),
                ],
            ]);
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
                    'oauth_configured' => $service->isOAuthConfigured(),
                    'message' => $service->isOAuthConfigured()
                        ? 'カレンダー接続を保存しました。Googleに接続すると実予定を取り込めます。'
                        : 'カレンダー接続を保存しました。GOOGLE_CLIENT_ID / SECRET 設定後にGoogleへ接続できます。',
                ],
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function oauthStart(CalendarConnectionService $service): JsonResponse
    {
        $connectionId = request()->query('connection_id');
        $id = is_numeric($connectionId) ? (int) $connectionId : null;
        $subject = request()->query('subject_role');
        $subjectRole = is_string($subject) ? $subject : null;

        try {
            $result = $service->beginOAuth($id, $subjectRole);
        } catch (RuntimeException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
                'errors' => (object) [],
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'oauth_url' => $result['oauth_url'],
            ],
        ]);
    }

    public function calendars(int $id, CalendarConnectionService $service): JsonResponse
    {
        try {
            $calendars = $service->listGoogleCalendars($id);
        } catch (RuntimeException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
                'errors' => (object) [],
            ], 502);
        }

        return response()->json([
            'status' => 'success',
            'data' => $calendars,
        ]);
    }

    public function selectCalendar(
        int $id,
        SelectCalendarRequest $request,
        CalendarConnectionService $service,
    ): JsonResponse {
        try {
            $connection = $service->selectCalendar($id, $request->validated());
        } catch (RuntimeException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
                'errors' => (object) [],
            ], 422);
        }

        return (new CalendarConnectionResource($connection))
            ->additional([
                'status' => 'success',
                'meta' => [
                    'message' => '取り込むカレンダーを更新しました。',
                ],
            ])
            ->response();
    }

    public function sync(int $id, CalendarConnectionService $service): JsonResponse
    {
        $date = request()->query('date');
        $localDate = is_string($date) && $date !== '' ? $date : null;

        try {
            $result = $service->sync($id, $localDate);
        } catch (RuntimeException $exception) {
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

    public function destroy(int $id, CalendarConnectionService $service): JsonResponse
    {
        $connection = $service->disconnect($id);

        return (new CalendarConnectionResource($connection))
            ->additional([
                'status' => 'success',
                'meta' => [
                    'message' => 'Googleカレンダー接続を解除しました。',
                ],
            ])
            ->response();
    }
}
