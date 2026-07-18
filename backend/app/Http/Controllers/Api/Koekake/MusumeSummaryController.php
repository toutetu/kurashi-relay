<?php

namespace App\Http\Controllers\Api\Koekake;

use App\Http\Controllers\Controller;
use App\Http\Requests\Musume\MusumeSummaryRequest;
use App\Services\Musume\MusumePlanService;
use Illuminate\Http\JsonResponse;

final class MusumeSummaryController extends Controller
{
    public function show(
        MusumeSummaryRequest $request,
        MusumePlanService $service,
    ): JsonResponse {
        return response()->json($service->getSummary($request->validated('date')));
    }
}
