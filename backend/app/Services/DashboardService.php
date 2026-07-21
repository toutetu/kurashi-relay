<?php

namespace App\Services;

use App\Models\ActivityDefinition;
use App\Models\ActivityEvent;
use App\Models\DailyCondition;
use App\Models\PlannedActivity;
use App\Support\FamilyMemberResolver;
use App\Support\JstDate;
use Database\Support\ActivityDefinitionCatalog;
use Illuminate\Support\Collection;

final class DashboardService
{
    public function __construct(
        private readonly PlannedActivityService $plannedActivities,
        private readonly HomeEventService $homeEvents,
        private readonly ScheduleComparisonService $scheduleComparisons,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function get(?string $date = null): array
    {
        $resolvedDate = $date ?? JstDate::today();
        $plans = $this->plannedActivities->listForHomeDate($resolvedDate);
        $comparison = $this->scheduleComparisons->forDate($resolvedDate);
        $condition = $this->homeEvents->conditionsForDate($resolvedDate);
        $currentActivity = $this->homeEvents->runningActivity();

        return [
            'date' => $resolvedDate,
            'currentActivity' => $this->mapCurrentActivity($currentActivity),
            'nextPlans' => $this->mapNextPlans($plans, $resolvedDate),
            'quickActivities' => $this->mapQuickActivities(),
            'quickLogs' => $this->mapQuickLogs($this->homeEvents->quickLogCounts($resolvedDate)),
            'conditions' => $this->mapConditions($condition),
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
            'scheduleImpactSummary' => $comparison['summary'],
            'actionItems' => [],
            'lastWar' => [
                'gameName' => 'ラストウォー',
                'plannedTasks' => [],
                'completedCount' => 0,
                'totalCount' => 0,
                'playMinutes' => 0,
                'recoveryEffect' => 0,
            ],
            'scheduleComparisons' => $comparison['comparisons'],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function mapCurrentActivity(?ActivityEvent $event): ?array
    {
        if ($event === null) {
            return null;
        }

        $link = $event->planActualLinks->firstWhere('link_type', 'primary');
        $plan = $link?->plannedActivity;

        return [
            'id' => (string) $event->id,
            'eventId' => $event->id,
            'activityDefinitionId' => $event->activity_definition_id,
            'plannedActivityId' => $plan?->id,
            'title' => $plan?->title_snapshot
                ?? $event->activityDefinition?->quick_label
                ?? $event->activityDefinition?->name
                ?? '活動',
            'category' => $this->mapCategory(
                $plan?->category_snapshot ?? $event->activityDefinition?->category,
                $event->activityDefinition?->kind,
            ),
            'startedAt' => $event->occurred_at->timezone('Asia/Tokyo')->toIso8601String(),
            'status' => 'running',
            'relatedPlanTitle' => $plan?->title_snapshot,
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
                $outcome = $this->resolvePlanOutcome($plan);
                $isMother = $plan->subject_member_id === FamilyMemberResolver::motherId();

                return [
                    'id' => (string) $plan->id,
                    'startAt' => $start,
                    'endAt' => $end,
                    'title' => $plan->title_snapshot,
                    'category' => $this->mapCategory($plan->category_snapshot, $plan->activityDefinition?->kind),
                    'source' => $plan->source_type === 'google_calendar' ? 'google' : 'manual',
                    'status' => $plan->status === 'cancelled' ? 'cancelled' : 'planned',
                    'outcome' => $outcome,
                    'recordable' => $isMother && $outcome === null,
                ];
            })
            ->all();
    }

    private function resolvePlanOutcome(PlannedActivity $plan): ?string
    {
        if ($plan->status === 'cancelled') {
            return 'skipped';
        }

        foreach ($plan->planActualLinks as $link) {
            $event = $link->activityEvent;
            if ($event === null) {
                continue;
            }
            if ($event->ended_at !== null && $event->cancellation === null) {
                return 'done';
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function mapQuickActivities(): array
    {
        $definitionKeys = ActivityDefinitionCatalog::quickActivityDefinitionKeys();
        $definitions = ActivityDefinition::query()
            ->where('is_active', true)
            ->whereIn('activity_key', array_values($definitionKeys))
            ->get()
            ->keyBy('activity_key');

        $options = [];
        foreach ($definitionKeys as $category => $key) {
            $definition = $definitions->get($key);
            if (! $definition instanceof ActivityDefinition) {
                continue;
            }

            $options[] = [
                'id' => 'preset:'.$category,
                'label' => $definition->quick_label,
                'category' => $category,
                'source' => 'preset',
                'activityDefinitionId' => $definition->id,
                'plannedActivityId' => null,
                'plannedStartAt' => null,
                'plannedEndAt' => null,
            ];
        }

        return $options;
    }

    /**
     * @param  list<array{type: string, label: string, count: int, activity_definition_id: int|null}>  $logs
     * @return list<array<string, mixed>>
     */
    private function mapQuickLogs(array $logs): array
    {
        return array_map(fn (array $log): array => [
            'type' => $log['type'],
            'label' => $log['label'],
            'count' => $log['count'],
            'activityDefinitionId' => $log['activity_definition_id'],
        ], $logs);
    }

    /**
     * @return array{mother: array<string, mixed>, daughter: array<string, mixed>}
     */
    private function mapConditions(?DailyCondition $condition): array
    {
        return [
            'mother' => [
                'physical' => $condition?->mother_physical ?? 3,
                'mood' => $condition?->mother_mood ?? 3,
                'inputSource' => $this->mapSource($condition?->mother_source, 'self'),
            ],
            'daughter' => [
                'physical' => $condition?->daughter_physical ?? 3,
                'mood' => $condition?->daughter_mood ?? 3,
                'inputSource' => $this->mapSource($condition?->daughter_source, 'guardian_observation'),
            ],
        ];
    }

    private function mapSource(?string $source, string $fallback): string
    {
        $allowed = ['self', 'guardian_confirmed', 'guardian_observation'];

        if ($source !== null && in_array($source, $allowed, true)) {
            return $source;
        }

        if ($source === 'mother_assumption') {
            return 'guardian_observation';
        }

        return $fallback;
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
