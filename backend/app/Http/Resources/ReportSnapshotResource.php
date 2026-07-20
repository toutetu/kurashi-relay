<?php

namespace App\Http\Resources;

use App\Models\ReportSnapshot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ReportSnapshot */
final class ReportSnapshotResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ReportSnapshot $report */
        $report = $this->resource;

        return [
            'id' => $report->id,
            'audience' => $report->audience,
            'period_start' => $report->period_start?->toDateString(),
            'period_end' => $report->period_end?->toDateString(),
            'title' => $report->title,
            'payload' => $report->payload,
            'excludes_last_war' => $report->excludes_last_war,
            'share_token' => $report->share_token,
            'share_expires_at' => $report->share_expires_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'created_at' => $report->created_at?->timezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
