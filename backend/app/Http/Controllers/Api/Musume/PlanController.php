<?php

namespace App\Http\Controllers\Api\Musume;

use App\Http\Controllers\Controller;
use App\Http\Requests\Musume\CompleteReflectionRequest;
use App\Http\Requests\Musume\ReplacePlanItemsRequest;
use App\Http\Requests\Musume\ShowPlanRequest;
use App\Http\Requests\Musume\UpdatePlanRequest;
use App\Services\Musume\MusumePlanService;
use Illuminate\Http\JsonResponse;

final class PlanController extends Controller
{
    public function show(
        ShowPlanRequest $request,
        MusumePlanService $service,
    ): JsonResponse {
        return response()->json($service->getOrCreatePlan($request->validated('date')));
    }

    public function update(
        int $id,
        UpdatePlanRequest $request,
        MusumePlanService $service,
    ): JsonResponse {
        return response()->json($service->updatePlan($id, $request->validated()));
    }

    public function replaceItems(
        int $id,
        ReplacePlanItemsRequest $request,
        MusumePlanService $service,
    ): JsonResponse {
        return response()->json($service->replaceItems(
            $id,
            $request->validated('category'),
            $request->validated('titles'),
        ));
    }

    public function completeReflection(
        int $id,
        CompleteReflectionRequest $request,
        MusumePlanService $service,
    ): JsonResponse {
        return response()->json($service->completeReflection(
            $id,
            $request->validated('mode'),
            $request->validated('note'),
        ));
    }
}
