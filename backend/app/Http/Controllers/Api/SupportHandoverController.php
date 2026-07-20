<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupportHandoverRequest;
use App\Http\Requests\UpdateSupportHandoverRequest;
use App\Http\Resources\SupportHandoverResource;
use App\Services\SupportHandoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class SupportHandoverController extends Controller
{
    public function index(Request $request, SupportHandoverService $service): AnonymousResourceCollection
    {
        $date = $request->query('date');
        $status = $request->query('status');

        $items = $service->list(
            is_string($date) && $date !== '' ? $date : null,
            is_string($status) && $status !== '' ? $status : null,
        );

        return SupportHandoverResource::collection($items)->additional(['status' => 'success']);
    }

    public function store(
        StoreSupportHandoverRequest $request,
        SupportHandoverService $service,
    ): JsonResponse {
        $item = $service->create($request->validated());

        return (new SupportHandoverResource($item))
            ->additional(['status' => 'success'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        int $id,
        UpdateSupportHandoverRequest $request,
        SupportHandoverService $service,
    ): SupportHandoverResource {
        $item = $service->update($id, $request->validated());

        return (new SupportHandoverResource($item))->additional(['status' => 'success']);
    }

    public function destroy(int $id, SupportHandoverService $service): SupportHandoverResource
    {
        $item = $service->cancel($id);

        return (new SupportHandoverResource($item))->additional(['status' => 'success']);
    }
}
