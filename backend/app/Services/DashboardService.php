<?php

namespace App\Services;

use App\Models\PlannedActivity;
use App\Support\JstDate;
use Illuminate\Support\Collection;

final class DashboardService
{
    public function __construct(
        private readonly PlannedActivityService $plannedActivities,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function get(?string $date = null): array
    {
        $resolvedDate = $date ?? JstDate::today();
        $plans = $this->plannedActivities->listForDate($resolvedDate);

        return [
            'date' => $resolvedDate,
            'currentActivity' => null,
            'nextPlans' => $this->mapNextPlans($plans, $resolvedDate),
            'quickLogs' => [],
            'conditions' => [
                'mother' => [
                    'physical' => 3,
                    'mood' => 3,
                    'inputSource' => 'self',
                ],
                'daughter' => [
                    'physical' => 3,
                    'mood' => 3,
                    'inputSource' => 'guardian_observation',
                ],
            ],
            'childStrategy' => [
                'desiredOutcome' => '',
                'firstStep' => '',
                'requestedSupports' => [],
                'fallbackPlans' => [],
                'confidence' => 'unset',
                'note' => '',
            ],
            'timeBalance' => [
                'sleepMinutes' => 0,
                'waitingMinutes' => 0,
                'activityMinutes' => 0,
                'recoveryMinutes' => 0,
            ],
            'scheduleImpactSummary' => [
                'onScheduleCount' => 0,
                'delayedCount' => 0,
                'interruptedCount' => 0,
                'cancelledCount' => 0,
                'movedToNightCount' => 0,
                'lostMinutes' => 0,
                'mainCauses' => [],
            ],
            'actionItems' => [],
            'lastWar' => [
                'gameName' => 'ラストウォー',
                'plannedTasks' => [],
                'completedCount' => 0,
                'totalCount' => 0,
                'playMinutes' => 0,
                'recoveryEffect' => 0,
            ],
            'scheduleComparisons' => [],
        ];
    }

    /**
     * @param  Collection<int, PlannedActivity>  $plans
     * @return list<array<string, mixed>>
     */
    private function mapNextPlans(Collection $plans, string $date): array
    {
        return $plans
            ->values()
            ->map(function (PlannedActivity $plan) use ($date): array {
                $start = $plan->planned_start_at?->timezone('Asia/Tokyo')->toIso8601String()
                    ?? "{$date}T00:00:00+09:00";
                $end = $plan->planned_end_at?->timezone('Asia/Tokyo')->toIso8601String()
                    ?? ($plan->is_all_day ? "{$date}T23:59:59+09:00" : $start);

                return [
                    'id' => (string) $plan->id,
                    'startAt' => $start,
                    'endAt' => $end,
                    'title' => $plan->title_snapshot,
                    'category' => $this->mapCategory($plan->category_snapshot, $plan->activityDefinition?->kind),
                    'source' => $plan->source_type === 'google_calendar' ? 'google' : 'manual',
                    'status' => $plan->status === 'cancelled' ? 'cancelled' : 'planned',
                ];
            })
            ->all();
    }

    private function mapCategory(?string $snapshot, ?string $kind): string
    {
        $allowed = [
            'work_preparation',
            'housework',
            'school_support',
            'waiting',
            'recovery',
            'last_war',
        ];

        if ($snapshot !== null && in_array($snapshot, $allowed, true)) {
            return $snapshot;
        }

        return match ($kind) {
            'waiting' => 'waiting',
            'recovery', 'sleep' => 'recovery',
            'support' => 'school_support',
            default => 'housework',
        };
    }
}
