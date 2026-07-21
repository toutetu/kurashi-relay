<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\PlannedActivity;
use App\Models\ScheduleImpact;
use App\Support\FamilyMemberResolver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class ScheduleComparisonService
{
    /**
     * 母（私）の予定と実績だけを比較する。
     *
     * @return array{
     *   comparisons: list<array<string, mixed>>,
     *   summary: array<string, mixed>
     * }
     */
    public function forDate(string $date): array
    {
        $start = CarbonImmutable::parse($date, 'Asia/Tokyo')->startOfDay()->timezone('UTC');
        $end = CarbonImmutable::parse($date, 'Asia/Tokyo')->endOfDay()->timezone('UTC');
        $motherId = FamilyMemberResolver::motherId();

        /** @var Collection<int, PlannedActivity> $plans */
        $plans = PlannedActivity::query()
            ->with('activityDefinition')
            ->where('subject_member_id', $motherId)
            ->whereDate('local_date', $date)
            ->where('status', '!=', 'cancelled')
            ->orderBy('planned_start_at')
            ->get();

        /** @var Collection<int, ActivityEvent> $events */
        $events = ActivityEvent::query()
            ->with(['activityDefinition', 'cancellation', 'planActualLinks'])
            ->where('recorded_by_member_id', $motherId)
            ->where('event_type', 'activity')
            ->whereBetween('occurred_at', [$start, $end])
            ->whereDoesntHave('cancellation')
            ->orderBy('occurred_at')
            ->get();

        $impacts = ScheduleImpact::query()
            ->whereIn('planned_activity_id', $plans->pluck('id'))
            ->get()
            ->groupBy('planned_activity_id');

        $comparisons = [];
        $usedEventIds = [];
        $planIds = $plans->pluck('id')->all();
        $explicitEventIds = $events
            ->filter(fn (ActivityEvent $event): bool => $event->planActualLinks->contains(
                fn ($link): bool => $link->link_type === 'primary'
                    && in_array($link->planned_activity_id, $planIds, true),
            ))
            ->pluck('id')
            ->all();

        foreach ($plans as $plan) {
            $planStart = CarbonImmutable::parse(
                ($plan->planned_start_at
                    ?? CarbonImmutable::parse($date, 'Asia/Tokyo')->startOfDay())->toIso8601String()
            );
            $planEnd = CarbonImmutable::parse(
                ($plan->planned_end_at
                    ?? ($plan->is_all_day
                        ? CarbonImmutable::parse($date, 'Asia/Tokyo')->endOfDay()
                        : $planStart->addHour()))->toIso8601String()
            );
            $linked = $events->filter(function (ActivityEvent $event) use ($plan, $usedEventIds): bool {
                if (in_array($event->id, $usedEventIds, true)) {
                    return false;
                }

                return $event->planActualLinks->contains(
                    fn ($link): bool => $link->planned_activity_id === $plan->id
                        && $link->link_type === 'primary',
                );
            });

            foreach ($linked as $event) {
                $usedEventIds[] = $event->id;
            }

            $overlapping = $linked->isNotEmpty()
                ? collect()
                : $events->filter(function (ActivityEvent $event) use (
                    $planStart,
                    $planEnd,
                    $usedEventIds,
                    $explicitEventIds,
                ): bool {
                    if (in_array($event->id, $usedEventIds, true)
                        || in_array($event->id, $explicitEventIds, true)) {
                        return false;
                    }

                    $eventStart = $event->occurred_at;
                    $eventEnd = \App\Support\ActivityEventTime::effectiveEnd($event);

                    return $eventStart < $planEnd && $eventEnd > $planStart;
                });

            foreach ($overlapping as $event) {
                $usedEventIds[] = $event->id;
            }

            $actualEvents = $linked
                ->concat($overlapping)
                ->sortBy(fn (ActivityEvent $event) => $event->occurred_at)
                ->values();

            $planImpacts = $impacts->get($plan->id, collect());
            $comparisons[] = $this->buildPlanComparison($plan, $planStart, $planEnd, $actualEvents, $planImpacts);
        }

        foreach ($events as $event) {
            if (in_array($event->id, $usedEventIds, true)) {
                continue;
            }

            $comparisons[] = $this->buildUnplannedComparison($event);
        }

        usort($comparisons, function (array $a, array $b): int {
            return strcmp($a['timeRange']['start'], $b['timeRange']['start']);
        });

        return [
            'comparisons' => $comparisons,
            'summary' => $this->summarize($comparisons),
        ];
    }

    /**
     * @param  Collection<int, ActivityEvent>  $overlapping
     * @param  Collection<int, ScheduleImpact>  $planImpacts
     * @return array<string, mixed>
     */
    private function buildPlanComparison(
        PlannedActivity $plan,
        CarbonImmutable $planStart,
        CarbonImmutable $planEnd,
        Collection $overlapping,
        Collection $planImpacts,
    ): array {
        $plannedMinutes = max(0, (int) $planStart->diffInMinutes($planEnd));
        $actuals = $overlapping
            ->map(function (ActivityEvent $event) use ($plan): array {
                $explicitlyLinked = $event->planActualLinks->contains(
                    fn ($link): bool => $link->planned_activity_id === $plan->id
                        && $link->link_type === 'primary',
                );

                return $this->mapActual(
                    $event,
                    $explicitlyLinked ? $plan->title_snapshot : null,
                );
            })
            ->values()
            ->all();
        $actualMinutes = array_sum(array_map(
            fn (array $a): int => max(0, (int) CarbonImmutable::parse($a['startAt'])->diffInMinutes(CarbonImmutable::parse($a['endAt']))),
            $actuals,
        ));

        $firstActualStart = $overlapping->first()?->occurred_at;
        $startDelay = $firstActualStart !== null
            ? max(0, (int) $planStart->diffInMinutes($firstActualStart))
            : 0;

        $impactType = $planImpacts->first()?->impact_type;
        $lostFromImpact = (int) $planImpacts->sum('lost_minutes');
        $interruptionCount = (int) $planImpacts->sum('interruption_count');

        $status = $this->resolveStatus(
            $overlapping->isEmpty(),
            $startDelay,
            $impactType,
            $plannedMinutes,
            $actualMinutes,
        );

        $lostMinutes = $lostFromImpact > 0
            ? $lostFromImpact
            : max(0, $plannedMinutes - $actualMinutes);

        $causes = $planImpacts
            ->map(fn (ScheduleImpact $impact) => $impact->note)
            ->filter()
            ->values()
            ->all();

        if ($causes === [] && $overlapping->isNotEmpty()) {
            $causes = $overlapping
                ->map(fn (ActivityEvent $e) => $e->activityDefinition?->name)
                ->filter()
                ->values()
                ->all();
        }

        $isDone = $overlapping->contains(fn (ActivityEvent $event): bool => $event->ended_at !== null
            && $event->cancellation === null
            && $event->planActualLinks->contains(
                fn ($link): bool => $link->planned_activity_id === $plan->id
                    && $link->link_type === 'primary',
            ));
        $outcome = $isDone ? 'done' : null;

        return [
            'timeRange' => [
                'start' => $planStart->timezone('Asia/Tokyo')->toIso8601String(),
                'end' => $planEnd->timezone('Asia/Tokyo')->toIso8601String(),
            ],
            'plan' => [
                'id' => (string) $plan->id,
                'title' => $plan->title_snapshot,
                'startAt' => $planStart->timezone('Asia/Tokyo')->toIso8601String(),
                'endAt' => $planEnd->timezone('Asia/Tokyo')->toIso8601String(),
                'category' => $this->mapCategory($plan->category_snapshot, $plan->activityDefinition?->kind),
                'details' => [],
                'outcome' => $outcome,
                'recordable' => $outcome === null,
            ],
            'actuals' => $actuals,
            'difference' => [
                'status' => $status,
                'startDelayMinutes' => $startDelay,
                'plannedMinutes' => $plannedMinutes,
                'actualMinutes' => $actualMinutes,
                'interruptionCount' => $interruptionCount,
                'lostMinutes' => $status === 'on_schedule' ? 0 : $lostMinutes,
                'causes' => $causes,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildUnplannedComparison(ActivityEvent $event): array
    {
        $actual = $this->mapActual($event);
        $start = CarbonImmutable::parse($actual['startAt']);
        $end = CarbonImmutable::parse($actual['endAt']);
        $minutes = max(0, (int) $start->diffInMinutes($end));

        return [
            'timeRange' => [
                'start' => $actual['startAt'],
                'end' => $actual['endAt'],
            ],
            'plan' => null,
            'actuals' => [$actual],
            'difference' => [
                'status' => 'unplanned_activity',
                'startDelayMinutes' => 0,
                'plannedMinutes' => 0,
                'actualMinutes' => $minutes,
                'interruptionCount' => 0,
                'lostMinutes' => 0,
                'causes' => [],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapActual(ActivityEvent $event, ?string $titleOverride = null): array
    {
        $start = $event->occurred_at->timezone('Asia/Tokyo');
        $end = \App\Support\ActivityEventTime::effectiveEnd($event)->timezone('Asia/Tokyo');
        $kind = match ($event->activityDefinition?->kind) {
            'waiting' => 'waiting',
            'sleep' => 'sleep',
            'recovery' => 'recovery',
            default => 'activity',
        };

        return [
            'id' => (string) $event->id,
            'title' => $titleOverride
                ?? $event->activityDefinition?->quick_label
                ?? $event->activityDefinition?->name
                ?? '記録',
            'kind' => $kind,
            'category' => $event->activityDefinition?->category
                ?? $event->activityDefinition?->kind
                ?? 'activity',
            'startAt' => $start->toIso8601String(),
            'endAt' => $end->toIso8601String(),
            'details' => [],
        ];
    }

    private function resolveStatus(
        bool $noActual,
        int $startDelay,
        ?string $impactType,
        int $plannedMinutes,
        int $actualMinutes,
    ): string {
        if ($impactType === 'cancelled' || ($noActual && $plannedMinutes > 0)) {
            return 'cancelled';
        }
        if ($impactType === 'moved_to_night') {
            return 'moved_to_night';
        }
        if ($impactType === 'interrupted' || ($impactType === null && $actualMinutes > 0 && $actualMinutes < ($plannedMinutes * 0.5))) {
            return 'interrupted';
        }
        if ($impactType === 'delayed' || $startDelay >= 15) {
            return 'delayed';
        }

        return 'on_schedule';
    }

    /**
     * @param  list<array<string, mixed>>  $comparisons
     * @return array<string, mixed>
     */
    private function summarize(array $comparisons): array
    {
        $onSchedule = 0;
        $delayed = 0;
        $interrupted = 0;
        $cancelled = 0;
        $movedToNight = 0;
        $lostMinutes = 0;
        $causes = [];

        foreach ($comparisons as $item) {
            $status = $item['difference']['status'] ?? '';
            $lostMinutes += (int) ($item['difference']['lostMinutes'] ?? 0);
            match ($status) {
                'on_schedule' => $onSchedule++,
                'delayed' => $delayed++,
                'interrupted' => $interrupted++,
                'cancelled' => $cancelled++,
                'moved_to_night' => $movedToNight++,
                default => null,
            };
            foreach ($item['difference']['causes'] ?? [] as $cause) {
                if (! is_string($cause) || $cause === '') {
                    continue;
                }
                $causes[$cause] = ($causes[$cause] ?? 0) + (int) ($item['difference']['lostMinutes'] ?? 0);
            }
        }

        arsort($causes);
        $mainCauses = [];
        foreach (array_slice($causes, 0, 5, true) as $label => $minutes) {
            $mainCauses[] = ['label' => $label, 'minutes' => $minutes];
        }

        return [
            'onScheduleCount' => $onSchedule,
            'delayedCount' => $delayed,
            'interruptedCount' => $interrupted,
            'cancelledCount' => $cancelled,
            'movedToNightCount' => $movedToNight,
            'lostMinutes' => $lostMinutes,
            'mainCauses' => $mainCauses,
        ];
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
