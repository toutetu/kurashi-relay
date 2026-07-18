<?php

namespace App\Services\Musume;

use App\Models\DailyPlan;
use App\Models\PlanItem;
use App\Models\ReflectionSession;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class MusumePlanService
{
    /**
     * @return array{plan: array<string, mixed>}
     */
    public function getOrCreatePlan(?string $date): array
    {
        $planDate = $date ?? JstDate::today();

        $this->ensureDailyPlan($planDate);

        $plan = $this->loadPlan($planDate);

        return $this->formatPlanResponse($plan);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array{plan: array<string, mixed>}
     */
    public function updatePlan(int $id, array $attributes): array
    {
        return DB::transaction(function () use ($id, $attributes): array {
            $plan = DailyPlan::query()->lockForUpdate()->findOrFail($id);

            $updates = array_intersect_key($attributes, array_flip([
                'mode',
                'school_start_period',
                'wake_up_time',
                'today_state',
                'tomorrow_items_state',
                'start_state',
            ]));

            if (array_key_exists('school_start_period', $updates) && $updates['school_start_period'] !== null) {
                $updates['start_state'] = 'decided';
            }

            if (array_key_exists('wake_up_time', $updates) && $updates['wake_up_time'] !== null) {
                $updates['start_state'] = 'decided';
            }

            if ($updates !== []) {
                $plan->update($updates);
            }

            return $this->formatPlanResponse($this->reloadPlan($plan));
        });
    }

    /**
     * @param  list<string>  $titles
     * @return array{plan: array<string, mixed>}
     */
    public function replaceItems(int $planId, string $category, array $titles): array
    {
        return DB::transaction(function () use ($planId, $category, $titles): array {
            $plan = DailyPlan::query()->lockForUpdate()->findOrFail($planId);

            PlanItem::query()
                ->where('daily_plan_id', $plan->id)
                ->where('category', $category)
                ->delete();

            foreach ($titles as $sortOrder => $title) {
                PlanItem::query()->create([
                    'daily_plan_id' => $plan->id,
                    'category' => $category,
                    'title' => $title,
                    'status' => 'planned',
                    'sort_order' => $sortOrder,
                ]);
            }

            if ($category === 'today_task') {
                $plan->update([
                    'today_state' => $titles === [] ? 'undecided' : 'decided',
                ]);
            } elseif ($category === 'tomorrow_item') {
                $plan->update([
                    'tomorrow_items_state' => $titles === [] ? 'undecided' : 'decided',
                ]);
            }

            return $this->formatPlanResponse($this->reloadPlan($plan));
        });
    }

    /**
     * @return array{plan: array<string, mixed>}
     */
    public function completeReflection(int $planId, string $mode, ?string $note): array
    {
        return DB::transaction(function () use ($planId, $mode, $note): array {
            $plan = DailyPlan::query()->lockForUpdate()->findOrFail($planId);
            $now = now('UTC');

            $session = ReflectionSession::query()->firstOrNew(['daily_plan_id' => $plan->id]);
            if (! $session->exists) {
                $session->started_at = $now;
                $session->completed_at = $now;
            }
            $session->mode = $mode;
            $session->note = $note;
            $session->save();

            if ($plan->review_completed_at === null) {
                $plan->update(['review_completed_at' => $session->completed_at]);
            }

            return $this->formatPlanResponse($this->reloadPlan($plan));
        });
    }

    /**
     * @return array{summary: array<string, mixed>|null}
     */
    public function getSummary(?string $date): array
    {
        $planDate = $date ?? JstDate::today();

        $plan = DailyPlan::query()
            ->with([
                'planItems' => fn ($q) => $q->orderBy('sort_order'),
            ])
            ->where('plan_date', $planDate)
            ->first();

        if ($plan === null) {
            return ['summary' => null];
        }

        $itemsByCategory = $plan->planItems->groupBy('category');

        return [
            'summary' => [
                'mode' => $plan->mode,
                'today_tasks' => $this->titlesForCategory($itemsByCategory, 'today_task'),
                'tomorrow_items' => $this->titlesForCategory($itemsByCategory, 'tomorrow_item'),
                'wake_up_time' => $this->formatWakeUpTime($plan->wake_up_time),
                'school_start_period' => $plan->school_start_period,
                'today_state' => $plan->today_state,
                'tomorrow_items_state' => $plan->tomorrow_items_state,
                'start_state' => $plan->start_state,
                'review_completed_at' => $plan->review_completed_at !== null
                  ? $this->formatDateTime($plan->review_completed_at)
                  : null,
            ],
        ];
    }

    public function ensureDailyPlan(string $planDate): void
    {
        $existing = DailyPlan::query()->where('plan_date', $planDate)->exists();

        if ($existing) {
            return;
        }

        $mode = DailyPlan::query()
            ->where('plan_date', '<', $planDate)
            ->orderByDesc('plan_date')
            ->value('mode') ?? 'summer';

        DailyPlan::query()->insertOrIgnore([
            'plan_date' => $planDate,
            'mode' => $mode,
            'today_state' => 'undecided',
            'tomorrow_items_state' => 'undecided',
            'start_state' => 'undecided',
            'created_at' => now('UTC'),
            'updated_at' => now('UTC'),
        ]);
    }

    private function loadPlan(string $planDate): DailyPlan
    {
        return DailyPlan::query()
            ->with([
                'planItems' => fn ($q) => $q->orderBy('sort_order'),
                'reflectionSession',
            ])
            ->where('plan_date', $planDate)
            ->firstOrFail();
    }

    private function reloadPlan(DailyPlan $plan): DailyPlan
    {
        return $plan->fresh([
            'planItems' => fn ($q) => $q->orderBy('sort_order'),
            'reflectionSession',
        ]);
    }

    /**
     * @return array{plan: array<string, mixed>}
     */
    private function formatPlanResponse(DailyPlan $plan): array
    {
        $itemsByCategory = $plan->planItems->groupBy('category');

        return [
            'plan' => [
                'id' => $plan->id,
                'plan_date' => $plan->plan_date->toDateString(),
                'mode' => $plan->mode,
                'school_start_period' => $plan->school_start_period,
                'wake_up_time' => $this->formatWakeUpTime($plan->wake_up_time),
                'today_state' => $plan->today_state,
                'tomorrow_items_state' => $plan->tomorrow_items_state,
                'start_state' => $plan->start_state,
                'review' => $this->formatReview($plan),
                'items' => [
                    'today_task' => $this->formatItems($itemsByCategory, 'today_task'),
                    'tomorrow_item' => $this->formatItems($itemsByCategory, 'tomorrow_item'),
                    'memo' => $this->formatItems($itemsByCategory, 'memo'),
                ],
            ],
        ];
    }

    /**
     * @return array{mode: string, completed_at: string|null}
     */
    private function formatReview(DailyPlan $plan): array
    {
        $session = $plan->reflectionSession;

        if ($session !== null) {
            return [
                'mode' => $session->mode,
                'completed_at' => $session->completed_at !== null
                  ? $this->formatDateTime($session->completed_at)
                  : null,
            ];
        }

        return [
            'mode' => $this->defaultReflectionMode($plan->mode),
            'completed_at' => $plan->review_completed_at !== null
              ? $this->formatDateTime($plan->review_completed_at)
              : null,
        ];
    }

    private function defaultReflectionMode(string $planMode): string
    {
        return $planMode === 'summer' ? 'summer' : 'normal';
    }

    /**
     * @param  Collection<string, Collection<int, PlanItem>>  $itemsByCategory
     * @return list<array{id: int, title: string, sort_order: int}>
     */
    private function formatItems(Collection $itemsByCategory, string $category): array
    {
        return ($itemsByCategory->get($category) ?? collect())
            ->map(fn (PlanItem $item): array => [
                'id' => $item->id,
                'title' => $item->title,
                'sort_order' => $item->sort_order,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<string, Collection<int, PlanItem>>  $itemsByCategory
     * @return list<string>
     */
    private function titlesForCategory(Collection $itemsByCategory, string $category): array
    {
        return ($itemsByCategory->get($category) ?? collect())
            ->pluck('title')
            ->all();
    }

    private function formatWakeUpTime(mixed $wakeUpTime): ?string
    {
        if ($wakeUpTime === null) {
            return null;
        }

        if ($wakeUpTime instanceof \DateTimeInterface) {
            return CarbonImmutable::instance($wakeUpTime)->format('H:i');
        }

        return substr((string) $wakeUpTime, 0, 5);
    }

    public function formatDateTime(\DateTimeInterface $dateTime): string
    {
        return CarbonImmutable::instance($dateTime)
            ->timezone(JstDate::TIMEZONE)
            ->toIso8601String();
    }
}
