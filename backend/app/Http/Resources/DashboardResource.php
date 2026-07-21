<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class DashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $dashboard */
        $dashboard = $this->resource;

        return [
            'date' => $dashboard['date'],
            'currentActivity' => $dashboard['currentActivity'],
            'nextPlans' => $dashboard['nextPlans'],
            'quickActivities' => $dashboard['quickActivities'],
            'quickLogs' => $dashboard['quickLogs'],
            'conditions' => $dashboard['conditions'],
            'childStrategy' => $dashboard['childStrategy'],
            'timeBalance' => $dashboard['timeBalance'],
            'scheduleImpactSummary' => $dashboard['scheduleImpactSummary'],
            'actionItems' => $dashboard['actionItems'],
            'lastWar' => $dashboard['lastWar'],
            'scheduleComparisons' => $dashboard['scheduleComparisons'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'status' => 'success',
            'meta' => [
                'timezone' => 'Asia/Tokyo',
            ],
        ];
    }
}
