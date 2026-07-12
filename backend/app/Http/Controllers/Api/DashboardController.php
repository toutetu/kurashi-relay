<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DashboardRequest;
use App\Http\Resources\DashboardResource;
use App\Services\DashboardService;

final class DashboardController extends Controller
{
    public function __invoke(
        DashboardRequest $request,
        DashboardService $service,
    ): DashboardResource {
        $date = $request->validated('date');

        return new DashboardResource(
            $service->get(is_string($date) ? $date : null)
        );
    }
}
