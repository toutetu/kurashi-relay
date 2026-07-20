<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReportSnapshotResource;
use App\Services\ReportService;

final class SharedReportController extends Controller
{
    public function show(string $token, ReportService $service): ReportSnapshotResource
    {
        $report = $service->findByShareToken($token);

        return (new ReportSnapshotResource($report))->additional(['status' => 'success']);
    }
}
