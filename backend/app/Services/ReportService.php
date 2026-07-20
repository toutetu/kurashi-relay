<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\DailyCondition;
use App\Models\FamilySetting;
use App\Models\PlannedActivity;
use App\Models\ReportSnapshot;
use App\Models\SupportHandover;
use App\Support\FamilyMemberResolver;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ReportService
{
    public function __construct(
        private readonly ScheduleComparisonService $scheduleComparisons,
    ) {}

    /**
     * @return Collection<int, ReportSnapshot>
     */
    public function list(): Collection
    {
        return ReportSnapshot::query()
            ->whereNull('revoked_at')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param  array{
     *   audience: string,
     *   period_start: string,
     *   period_end: string,
     *   title?: string|null
     * }  $input
     */
    public function create(array $input): ReportSnapshot
    {
        $audience = $input['audience'];
        if (! in_array($audience, ['school', 'support_agency', 'family'], true)) {
            throw ValidationException::withMessages([
                'audience' => ['レポートの宛先が正しくありません。'],
            ]);
        }

        $settings = FamilySetting::query()->first();
        $excludeLastWar = $settings?->report_exclude_last_war ?? true;

        $payload = $this->buildPayload(
            $input['period_start'],
            $input['period_end'],
            $excludeLastWar,
        );

        $title = $input['title'] ?? sprintf(
            '%s向けレポート（%s〜%s）',
            match ($audience) {
                'school' => '学校',
                'support_agency' => '支援機関',
                default => '家族',
            },
            $input['period_start'],
            $input['period_end'],
        );

        return ReportSnapshot::query()->create([
            'audience' => $audience,
            'period_start' => $input['period_start'],
            'period_end' => $input['period_end'],
            'title' => $title,
            'payload' => $payload,
            'excludes_last_war' => $excludeLastWar,
            'created_by_member_id' => FamilyMemberResolver::motherId(),
        ]);
    }

    public function share(int $id): ReportSnapshot
    {
        $report = ReportSnapshot::query()
            ->whereNull('revoked_at')
            ->whereKey($id)
            ->first();

        if ($report === null) {
            throw (new ModelNotFoundException)->setModel(ReportSnapshot::class, [$id]);
        }

        if ($report->share_token === null) {
            $report->share_token = Str::random(48);
            $report->share_expires_at = now('UTC')->addDays(14);
            $report->save();
        }

        return $report->refresh();
    }

    public function findByShareToken(string $token): ReportSnapshot
    {
        $report = ReportSnapshot::query()
            ->where('share_token', $token)
            ->whereNull('revoked_at')
            ->first();

        if ($report === null) {
            throw (new ModelNotFoundException)->setModel(ReportSnapshot::class);
        }

        if ($report->share_expires_at !== null && $report->share_expires_at->isPast()) {
            throw (new ModelNotFoundException)->setModel(ReportSnapshot::class);
        }

        return $report;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(string $periodStart, string $periodEnd, bool $excludeLastWar): array
    {
        $dates = [];
        $cursor = $periodStart;
        while ($cursor <= $periodEnd) {
            $dates[] = $cursor;
            $cursor = date('Y-m-d', strtotime($cursor.' +1 day'));
        }

        $planCount = PlannedActivity::query()
            ->whereBetween('local_date', [$periodStart, $periodEnd])
            ->where('status', '!=', 'cancelled')
            ->count();

        $eventQuery = ActivityEvent::query()
            ->with('activityDefinition')
            ->whereDoesntHave('cancellation')
            ->whereBetween('occurred_at', [
                $periodStart.' 00:00:00',
                $periodEnd.' 23:59:59',
            ]);

        $events = $eventQuery->get();
        if ($excludeLastWar) {
            $events = $events->filter(function (ActivityEvent $event): bool {
                $category = $event->activityDefinition?->category;
                $name = $event->activityDefinition?->name ?? '';

                return $category !== 'last_war'
                    && ! str_contains($name, 'ラストウォー')
                    && ! str_contains($name, 'Last War');
            });
        }

        $conditions = DailyCondition::query()
            ->whereBetween('local_date', [$periodStart, $periodEnd])
            ->orderBy('local_date')
            ->get()
            ->map(fn (DailyCondition $c) => [
                'date' => $c->local_date?->toDateString(),
                'mother' => [
                    'physical' => $c->mother_physical,
                    'mood' => $c->mother_mood,
                    'source' => $c->mother_source,
                ],
                'daughter' => [
                    'physical' => $c->daughter_physical,
                    'mood' => $c->daughter_mood,
                    'source' => $c->daughter_source,
                ],
            ])
            ->values()
            ->all();

        $handovers = SupportHandover::query()
            ->whereNull('cancelled_at')
            ->whereBetween('local_date', [$periodStart, $periodEnd])
            ->orderBy('local_date')
            ->get()
            ->map(fn (SupportHandover $h) => [
                'title' => $h->title,
                'assignee' => $h->assignee_label,
                'conditions' => $h->conditions_text,
                'completionCriteria' => $h->completion_criteria,
                'result' => $h->result_text,
                'status' => $h->status,
                'sourceKind' => $h->source_kind,
            ])
            ->values()
            ->all();

        $dayComparisons = [];
        foreach ($dates as $date) {
            $dayComparisons[$date] = $this->scheduleComparisons->forDate($date)['summary'];
        }

        return [
            'generatedAt' => now('Asia/Tokyo')->toIso8601String(),
            'period' => ['start' => $periodStart, 'end' => $periodEnd],
            'excludesLastWar' => $excludeLastWar,
            'counts' => [
                'plannedActivities' => $planCount,
                'activityEvents' => $events->count(),
                'supportHandovers' => count($handovers),
            ],
            'conditions' => $conditions,
            'supportHandovers' => $handovers,
            'scheduleImpactByDay' => $dayComparisons,
            'note' => 'ラストウォーの詳細は含まれません。発言・観察・推測の区分を維持しています。',
        ];
    }
}
