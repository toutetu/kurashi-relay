<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListPlannedActivitiesRequest;
use App\Http\Requests\StorePlannedActivityRequest;
use App\Http\Requests\UpdatePlannedActivityRequest;
use App\Http\Resources\PlannedActivityResource;
use App\Services\PlannedActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class PlannedActivityController extends Controller
{
    public function index(
        ListPlannedActivitiesRequest $request,
        PlannedActivityService $service,
    ): AnonymousResourceCollection {
        $items = $service->listForDate(
            $request->validated('date'),
            $request->validated('subject'),
        );

        return PlannedActivityResource::collection($items)->additional([
            'status' => 'success',
            'meta' => [
                'timezone' => 'Asia/Tokyo',
                'date' => $request->validated('date'),
            ],
        ]);
    }

    public function options(PlannedActivityService $service): JsonResponse
    {
        $options = $service->listActivityOptions()->map(fn ($def) => [
            'id' => $def->id,
            'activity_key' => $def->activity_key,
            'name' => $def->name,
            'quick_label' => $def->quick_label,
            'kind' => $def->kind,
            'category' => $def->category,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $options,
        ]);
    }

    public function store(
        StorePlannedActivityRequest $request,
        PlannedActivityService $service,
    ): JsonResponse {
        $activity = $service->create($request->validated());

        return (new PlannedActivityResource($activity))
            ->additional(['status' => 'success'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        int $id,
        UpdatePlannedActivityRequest $request,
        PlannedActivityService $service,
    ): PlannedActivityResource {
        $activity = $service->update($id, $request->validated());

        return (new PlannedActivityResource($activity))->additional(['status' => 'success']);
    }

    public function destroy(
        int $id,
        PlannedActivityService $service,
    ): PlannedActivityResource {
        $activity = $service->cancel($id);

        return (new PlannedActivityResource($activity))->additional(['status' => 'success']);
    }
}
