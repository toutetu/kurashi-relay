<?php

namespace App\Http\Resources;

use App\Models\FamilySetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FamilySetting */
final class FamilySettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FamilySetting $settings */
        $settings = $this->resource;

        return [
            'day_type' => $settings->day_type,
            'report_exclude_last_war' => $settings->report_exclude_last_war,
            'display_note' => $settings->display_note,
        ];
    }
}
