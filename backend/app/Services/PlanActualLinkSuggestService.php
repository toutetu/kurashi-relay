<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\PlanActualLink;
use App\Models\PlannedActivity;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class PlanActualLinkSuggestService
{
    /**
     * @param  array{date: string}  $input
     * @return list<PlanActualLink>
     */
    public function suggest(array $input): array
    {
        $date = $input['date'];
        $start = CarbonImmutable::parse($date, 'Asia/Tokyo')->startOfDay()->timezone('UTC');
        $end = CarbonImmutable::parse($date, 'Asia/Tokyo')->endOfDay()->timezone('UTC');

        $plans = PlannedActivity::query()
            ->whereDate('local_date', $date)
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('planned_start_at')
            ->get();

        $events = ActivityEvent::query()
            ->whereBetween('occurred_at', [$start, $end])
            ->whereDoesntHave('cancellation')
            ->get();

        $created = [];

        return DB::transaction(function () use ($plans, $events, &$created): array {
            foreach ($plans as $plan) {
                $planStart = $plan->planned_start_at;
                $planEnd = $plan->planned_end_at ?? $planStart?->copy()->addHour();
                if ($planStart === null || $planEnd === null) {
                    continue;
                }

                foreach ($events as $event) {
                    $eventStart = $event->occurred_at;
                    $eventEnd = $event->ended_at ?? $eventStart->copy()->addMinutes(30);

                    if (! ($eventStart < $planEnd && $eventEnd > $planStart)) {
                        continue;
                    }

                    $exists = PlanActualLink::query()
                        ->where('planned_activity_id', $plan->id)
                        ->where('activity_event_id', $event->id)
                        ->where('link_type', 'primary')
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    $overlapStart = $eventStart->greaterThan($planStart) ? $eventStart : $planStart;
                    $overlapEnd = $eventEnd->lessThan($planEnd) ? $eventEnd : $planEnd;
                    $overlapMinutes = max(0, (int) $overlapStart->diffInMinutes($overlapEnd));
                    $planMinutes = max(1, (int) $planStart->diffInMinutes($planEnd));
                    $confidence = min(90, (int) round(($overlapMinutes / $planMinutes) * 100));

                    $created[] = PlanActualLink::query()->create([
                        'planned_activity_id' => $plan->id,
                        'activity_event_id' => $event->id,
                        'link_type' => 'primary',
                        'matched_by' => 'automatic',
                        'confidence' => $confidence,
                        'created_at' => now('UTC'),
                    ]);
                }
            }

            return $created;
        });
    }
}
