<?php

namespace App\Http\Controllers\Api\Koekake;

use App\Http\Controllers\Controller;
use App\Http\Requests\Koekake\UpdateCompletionRequest;
use App\Services\Koekake\CompletionService;
use Illuminate\Http\JsonResponse;

final class CompletionController extends Controller
{
    public function update(
        int $id,
        UpdateCompletionRequest $request,
        CompletionService $service,
    ): JsonResponse {
        return response()->json($service->update(
            $id,
            $request->validated('status'),
            $request->validated('note'),
        ));
    }
}
