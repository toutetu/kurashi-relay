<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFamilySettingRequest;
use App\Http\Resources\FamilySettingResource;
use App\Services\FamilySettingService;

final class FamilySettingController extends Controller
{
    public function show(FamilySettingService $service): FamilySettingResource
    {
        return (new FamilySettingResource($service->get()))
            ->additional(['status' => 'success']);
    }

    public function update(
        UpdateFamilySettingRequest $request,
        FamilySettingService $service,
    ): FamilySettingResource {
        $settings = $service->update($request->validated());

        return (new FamilySettingResource($settings))
            ->additional(['status' => 'success']);
    }
}
