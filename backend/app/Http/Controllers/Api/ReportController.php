<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Http\Resources\ReportSnapshotResource;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ReportController extends Controller
{
    public function index(ReportService $service): AnonymousResourceCollection
    {
        return ReportSnapshotResource::collection($service->list())
            ->additional(['status' => 'success']);
    }

    public function store(StoreReportRequest $request, ReportService $service): JsonResponse
    {
        $report = $service->create($request->validated());

        return (new ReportSnapshotResource($report))
            ->additional(['status' => 'success'])
            ->response()
            ->setStatusCode(201);
    }

    public function share(int $id, ReportService $service): ReportSnapshotResource
    {
        $report = $service->share($id);

        return (new ReportSnapshotResource($report))->additional(['status' => 'success']);
    }
}
