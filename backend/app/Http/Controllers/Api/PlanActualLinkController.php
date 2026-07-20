<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuggestPlanActualLinksRequest;
use App\Http\Resources\PlanActualLinkResource;
use App\Services\PlanActualLinkSuggestService;
use Illuminate\Http\JsonResponse;

final class PlanActualLinkController extends Controller
{
    public function suggest(
        SuggestPlanActualLinksRequest $request,
        PlanActualLinkSuggestService $service,
    ): JsonResponse {
        $links = $service->suggest($request->validated());

        return PlanActualLinkResource::collection(collect($links))
            ->additional([
                'status' => 'success',
                'meta' => [
                    'message' => '自動対応候補です。確定扱いではありません。',
                    'matched_by' => 'automatic',
                ],
            ])
            ->response()
            ->setStatusCode(201);
    }
}
