<?php

namespace App\Http\Controllers\Api\Koekake;

use App\Http\Controllers\Controller;
use App\Http\Requests\Koekake\KoekakeTaskIndexRequest;
use App\Services\Koekake\KoekakeTaskService;
use Illuminate\Http\JsonResponse;

final class KoekakeTaskController extends Controller
{
    public function index(
        KoekakeTaskIndexRequest $request,
        KoekakeTaskService $service,
    ): JsonResponse {
        $result = $service->listTasks(
            $request->validated('date'),
            $request->validated('phase'),
        );

        return response()->json($result);
    }

    public function show(int $id, KoekakeTaskService $service): JsonResponse
    {
        return response()->json($service->showTask($id));
    }
}
