<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePushSubscriptionRequest;
use App\Http\Resources\PushSubscriptionResource;
use App\Services\PushSubscriptionService;
use Illuminate\Http\JsonResponse;

final class PushSubscriptionController extends Controller
{
    public function store(
        StorePushSubscriptionRequest $request,
        PushSubscriptionService $service,
    ): JsonResponse {
        $subscription = $service->register($request->validated());

        return (new PushSubscriptionResource($subscription))
            ->additional([
                'status' => 'success',
                'meta' => $service->fireReminderStub(),
            ])
            ->response()
            ->setStatusCode(201);
    }
}
