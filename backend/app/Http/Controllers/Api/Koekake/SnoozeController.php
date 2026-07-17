<?php

namespace App\Http\Controllers\Api\Koekake;

use App\Http\Controllers\Controller;
use App\Http\Requests\Koekake\StoreSnoozeRequest;
use App\Services\Koekake\SnoozeService;
use Illuminate\Http\JsonResponse;

final class SnoozeController extends Controller
{
    public function store(
        int $id,
        StoreSnoozeRequest $request,
        SnoozeService $service,
    ): JsonResponse {
        return response()->json($service->store($id, $request->resolvedPayload()));
    }
}
