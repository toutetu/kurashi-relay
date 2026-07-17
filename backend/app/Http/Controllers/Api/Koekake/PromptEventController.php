<?php

namespace App\Http\Controllers\Api\Koekake;

use App\Http\Controllers\Controller;
use App\Http\Requests\Koekake\StorePromptEventRequest;
use App\Services\Koekake\PromptEventService;
use Illuminate\Http\JsonResponse;

final class PromptEventController extends Controller
{
    public function store(
        StorePromptEventRequest $request,
        PromptEventService $service,
    ): JsonResponse {
        $result = $service->store(
            (int) $request->validated('daily_task_id'),
            $request->validated('prompt_text'),
            $request->validated('source'),
            $request->validated('idempotency_key'),
        );

        $statusCode = $result['status_code'];
        unset($result['status_code']);

        return response()->json($result, $statusCode);
    }

    public function destroy(int $id, PromptEventService $service): JsonResponse
    {
        return response()->json($service->cancel($id));
    }
}
