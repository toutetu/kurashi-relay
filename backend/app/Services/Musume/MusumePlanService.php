<?php

namespace App\Services\Musume;

use App\Models\DailyPlan;
use App\Models\PlanAnswerVersion;
use App\Models\PlannedActivity;
use App\Models\PlanQuestion;
use App\Models\ReflectionSession;
use App\Support\FamilyMemberResolver;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class MusumePlanService
{
    private const ITEM_QUESTION_KEYS = [
        'today_task',
        'today_item',
        'bedtime',
        'tomorrow_plan',
        'tomorrow_item',
        'memo',
    ];

    private const PLANNABLE_QUESTION_KEYS = [
        'today_task',
        'tomorrow_plan',
        'bedtime',
        'wake_up_time',
        'school_start_period',
    ];

    private const NEXT_DAY_QUESTION_KEYS = [
        'tomorrow_plan',
        'wake_up_time',
        'school_start_period',
    ];

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

            if (array_key_exists('mode', $attributes)) {
                $plan->update(['mode' => $attributes['mode']]);
                $plan->refresh();
            }

            $decidedWithMemberId = ($attributes['start_decided_with'] ?? null) === 'mama'
                ? FamilyMemberResolver::motherId()
                : null;

            if (array_key_exists('wake_up_time', $attributes)) {
                $time = $attributes['wake_up_time'];
                $this->appendAnswerVersion(
                    $plan,
                    'wake_up_time',
                    ['time' => $time],
                    $this->isEmptyScalar($time) ? null : $decidedWithMemberId,
                );
            }

            if (array_key_exists('school_start_period', $attributes)) {
                $value = $attributes['school_start_period'];
                $this->appendAnswerVersion(
                    $plan,
                    'school_start_period',
                    ['value' => $value],
                    $this->isEmptyScalar($value) ? null : $decidedWithMemberId,
                );
            }

            if (array_key_exists('bedtime', $attributes)) {
                $this->appendAnswerVersion(
                    $plan,
                    'bedtime',
                    ['time' => $attributes['bedtime']],
                    null,
                );
            }

            return $this->formatPlanResponse($this->reloadPlan($plan));
        });
    }

    /**
     * @param  list<string>  $titles
     * @return array{plan: array<string, mixed>}
     */
    public function replaceItems(int $planId, string $category, array $titles, ?string $decidedWith = null): array
    {
        return DB::transaction(function () use ($planId, $category, $titles, $decidedWith): array {
            $plan = DailyPlan::query()->lockForUpdate()->findOrFail($planId);
            $question = PlanQuestion::query()->where('question_key', $category)->firstOrFail();

            $decidedWithMemberId = $decidedWith === 'mama'
                ? FamilyMemberResolver::motherId()
                : null;

            $valueJson = $this->valueJsonForTitles($question->answer_type, $titles);
            if ($this->isEmptyValueJson($question->answer_type, $valueJson)) {
                $decidedWithMemberId = null;
            }

            $this->appendAnswerVersion($plan, $category, $valueJson, $decidedWithMemberId);

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

            $session = ReflectionSession::query()->firstOrNew([
                'daily_plan_id' => $plan->id,
                'revision_no' => 1,
            ]);
            if (! $session->exists) {
                $session->started_at = $now;
                $session->completed_at = $now;
                $session->revision_no = 1;
                $session->recorded_by_member_id = FamilyMemberResolver::childId();
            }
            $session->mode = $mode;
            $session->note = $note;
            $session->save();

            return $this->formatPlanResponse($this->reloadPlan($plan));
        });
    }

    /**
     * @return array{summary: array<string, mixed>|null}
     */
    public function getSummary(?string $date): array
    {
        $planDate = $date ?? JstDate::today();
        $childId = FamilyMemberResolver::childId();

        $plan = DailyPlan::query()
            ->with(['reflectionSession'])
            ->where('subject_member_id', $childId)
            ->where('plan_date', $planDate)
            ->first();

        if ($plan === null) {
            return ['summary' => null];
        }

        $latestByKey = $this->latestAnswersByQuestionKey($plan);

        $bedtimeTitles = $this->titlesFromAnswer($latestByKey->get('bedtime'));

        return [
            'summary' => [
                'mode' => $plan->mode,
                'today_tasks' => $this->titlesFromAnswer($latestByKey->get('today_task')),
                'today_items' => $this->titlesFromAnswer($latestByKey->get('today_item')),
                'bedtime' => $bedtimeTitles === [] ? null : $bedtimeTitles[0],
                'tomorrow_plans' => $this->titlesFromAnswer($latestByKey->get('tomorrow_plan')),
                'tomorrow_items' => $this->titlesFromAnswer($latestByKey->get('tomorrow_item')),
                'wake_up_time' => $this->timeFromAnswer($latestByKey->get('wake_up_time')),
                'school_start_period' => $this->choiceFromAnswer($latestByKey->get('school_start_period')),
                'decided_with' => [
                    'today' => $this->decidedWithLabel($latestByKey->get('today_task')),
                    'today_item' => $this->decidedWithLabel($latestByKey->get('today_item')),
                    'bedtime' => $this->decidedWithLabel($latestByKey->get('bedtime')),
                    'tomorrow_plan' => $this->decidedWithLabel($latestByKey->get('tomorrow_plan')),
                    'tomorrow_item' => $this->decidedWithLabel($latestByKey->get('tomorrow_item')),
                    'start' => $this->startDecidedWithLabel($plan, $latestByKey),
                ],
                'review_completed_at' => $plan->reflectionSession?->completed_at !== null
                    ? $this->formatDateTime($plan->reflectionSession->completed_at)
                    : null,
            ],
        ];
    }

    public function ensureDailyPlan(string $planDate): void
    {
        $childId = FamilyMemberResolver::childId();

        $existing = DailyPlan::query()
            ->where('subject_member_id', $childId)
            ->where('plan_date', $planDate)
            ->exists();

        if ($existing) {
            return;
        }

        $mode = DailyPlan::query()
            ->where('subject_member_id', $childId)
            ->where('plan_date', '<', $planDate)
            ->orderByDesc('plan_date')
            ->value('mode') ?? 'summer';

        DailyPlan::query()->insertOrIgnore([
            'subject_member_id' => $childId,
            'plan_date' => $planDate,
            'mode' => $mode,
            'created_at' => now('UTC'),
            'updated_at' => now('UTC'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $valueJson
     */
    private function appendAnswerVersion(
        DailyPlan $plan,
        string $questionKey,
        array $valueJson,
        ?int $decidedWithMemberId,
    ): PlanAnswerVersion {
        $question = PlanQuestion::query()
            ->with('activityDefinition')
            ->where('question_key', $questionKey)
            ->firstOrFail();

        $previous = PlanAnswerVersion::query()
            ->where('daily_plan_id', $plan->id)
            ->where('question_id', $question->id)
            ->orderByDesc('version_no')
            ->lockForUpdate()
            ->first();

        $now = now('UTC');

        $version = PlanAnswerVersion::query()->create([
            'daily_plan_id' => $plan->id,
            'question_id' => $question->id,
            'version_no' => ($previous?->version_no ?? 0) + 1,
            'value_json' => $valueJson,
            'decided_with_member_id' => $decidedWithMemberId,
            'recorded_by_member_id' => FamilyMemberResolver::childId(),
            'recorded_at' => $now,
            'supersedes_version_id' => $previous?->id,
            'created_at' => $now,
        ]);

        $this->syncPlannedActivities($plan, $question, $version);

        return $version;
    }

    private function syncPlannedActivities(
        DailyPlan $plan,
        PlanQuestion $question,
        PlanAnswerVersion $version,
    ): void {
        if (! in_array($question->question_key, self::PLANNABLE_QUESTION_KEYS, true)) {
            return;
        }

        $previousVersionIds = PlanAnswerVersion::query()
            ->where('daily_plan_id', $plan->id)
            ->where('question_id', $question->id)
            ->where('id', '!=', $version->id)
            ->pluck('id');

        if ($previousVersionIds->isNotEmpty()) {
            PlannedActivity::query()
                ->whereIn('plan_answer_version_id', $previousVersionIds)
                ->where('status', '!=', 'cancelled')
                ->update(['status' => 'cancelled']);
        }

        $entries = $this->buildPlannedActivityEntries($plan, $question, $version);

        foreach ($entries as $index => $entry) {
            PlannedActivity::query()->create([
                'subject_member_id' => $plan->subject_member_id,
                'activity_definition_id' => $question->activity_definition_id,
                'source_type' => 'child_plan',
                'source_key' => $version->id.':'.$index,
                'title_snapshot' => $entry['title'],
                'category_snapshot' => $question->question_key,
                'planned_start_at' => $entry['planned_start_at'],
                'planned_end_at' => null,
                'is_all_day' => $entry['is_all_day'],
                'local_date' => $entry['local_date'],
                'status' => 'planned',
                'routine_template_id' => null,
                'plan_answer_version_id' => $version->id,
                'calendar_event_version_id' => null,
            ]);
        }
    }

    /**
     * @return list<array{title: string, local_date: string, is_all_day: bool, planned_start_at: CarbonImmutable|null}>
     */
    private function buildPlannedActivityEntries(
        DailyPlan $plan,
        PlanQuestion $question,
        PlanAnswerVersion $version,
    ): array {
        $planDate = $plan->plan_date->toDateString();
        $localDate = in_array($question->question_key, self::NEXT_DAY_QUESTION_KEYS, true)
            ? CarbonImmutable::parse($planDate, JstDate::TIMEZONE)->addDay()->toDateString()
            : $planDate;

        $value = $version->value_json ?? [];

        return match ($question->answer_type) {
            'multi_select' => collect($value['values'] ?? [])
                ->filter(fn (mixed $title): bool => is_string($title) && $title !== '')
                ->values()
                ->map(fn (string $title): array => [
                    'title' => $title,
                    'local_date' => $localDate,
                    'is_all_day' => true,
                    'planned_start_at' => null,
                ])
                ->all(),
            'time' => $this->isEmptyScalar($value['time'] ?? null)
                ? []
                : [[
                    'title' => $this->titleForTimeQuestion($question),
                    'local_date' => $localDate,
                    'is_all_day' => false,
                    'planned_start_at' => CarbonImmutable::parse(
                        $localDate.' '.$value['time'],
                        JstDate::TIMEZONE,
                    )->utc(),
                ]],
            'choice' => $this->isEmptyScalar($value['value'] ?? null)
                ? []
                : [[
                    'title' => (string) $value['value'],
                    'local_date' => $localDate,
                    'is_all_day' => true,
                    'planned_start_at' => null,
                ]],
            default => [],
        };
    }

    private function titleForTimeQuestion(PlanQuestion $question): string
    {
        $fromActivity = $question->activityDefinition?->name;
        if (is_string($fromActivity) && $fromActivity !== '') {
            return $fromActivity;
        }

        return match ($question->question_key) {
            'wake_up_time' => '起床',
            'bedtime' => '寝る',
            default => $question->label !== '' ? $question->label : '予定',
        };
    }

    /**
     * @param  list<string>  $titles
     * @return array<string, mixed>
     */
    private function valueJsonForTitles(string $answerType, array $titles): array
    {
        return match ($answerType) {
            'multi_select' => ['values' => array_values($titles)],
            'text' => ['text' => $titles === [] ? null : implode("\n", $titles)],
            'time' => ['time' => $titles[0] ?? null],
            'choice' => ['value' => $titles[0] ?? null],
            default => ['values' => array_values($titles)],
        };
    }

    /**
     * @param  array<string, mixed>  $valueJson
     */
    private function isEmptyValueJson(string $answerType, array $valueJson): bool
    {
        return match ($answerType) {
            'multi_select' => ($valueJson['values'] ?? []) === [],
            'text' => $this->isEmptyScalar($valueJson['text'] ?? null),
            'time' => $this->isEmptyScalar($valueJson['time'] ?? null),
            'choice' => $this->isEmptyScalar($valueJson['value'] ?? null),
            default => true,
        };
    }

    private function isEmptyScalar(mixed $value): bool
    {
        return $value === null || $value === '';
    }

    private function loadPlan(string $planDate): DailyPlan
    {
        return DailyPlan::query()
            ->with(['reflectionSession'])
            ->where('subject_member_id', FamilyMemberResolver::childId())
            ->where('plan_date', $planDate)
            ->firstOrFail();
    }

    private function reloadPlan(DailyPlan $plan): DailyPlan
    {
        return $plan->fresh(['reflectionSession']) ?? $plan;
    }

    /**
     * @return array{plan: array<string, mixed>}
     */
    private function formatPlanResponse(DailyPlan $plan): array
    {
        $latestByKey = $this->latestAnswersByQuestionKey($plan);

        $items = [];
        foreach (self::ITEM_QUESTION_KEYS as $questionKey) {
            $items[$questionKey] = $this->formatItemsFromAnswer($latestByKey->get($questionKey));
        }

        return [
            'plan' => [
                'id' => $plan->id,
                'plan_date' => $plan->plan_date->toDateString(),
                'mode' => $plan->mode,
                'school_start_period' => $this->choiceFromAnswer($latestByKey->get('school_start_period')),
                'wake_up_time' => $this->timeFromAnswer($latestByKey->get('wake_up_time')),
                'start_decided_with' => $this->startDecidedWithLabel($plan, $latestByKey),
                'review' => $this->formatReview($plan),
                'items' => $items,
            ],
        ];
    }

    /**
     * @return Collection<string, PlanAnswerVersion>
     */
    private function latestAnswersByQuestionKey(DailyPlan $plan): Collection
    {
        return PlanAnswerVersion::query()
            ->where('daily_plan_id', $plan->id)
            ->with('question')
            ->orderByDesc('version_no')
            ->orderByDesc('id')
            ->get()
            ->unique('question_id')
            ->filter(fn (PlanAnswerVersion $version): bool => $version->question !== null)
            ->keyBy(fn (PlanAnswerVersion $version): string => $version->question->question_key);
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
            'completed_at' => null,
        ];
    }

    private function defaultReflectionMode(string $planMode): string
    {
        return $planMode === 'summer' ? 'summer' : 'normal';
    }

    /**
     * @return list<array{id: int, title: string, sort_order: int, decided_with: string|null}>
     */
    private function formatItemsFromAnswer(?PlanAnswerVersion $version): array
    {
        if ($version === null || $version->question === null) {
            return [];
        }

        $decidedWith = $this->decidedWithLabel($version);
        $titles = $this->titlesFromAnswer($version);

        return collect($titles)
            ->values()
            ->map(fn (string $title, int $index): array => [
                'id' => $this->deterministicItemId($version->id, $index),
                'title' => $title,
                'sort_order' => $index,
                'decided_with' => $decidedWith,
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    private function titlesFromAnswer(?PlanAnswerVersion $version): array
    {
        if ($version === null || $version->question === null) {
            return [];
        }

        $value = $version->value_json ?? [];

        return match ($version->question->answer_type) {
            'multi_select' => collect($value['values'] ?? [])
                ->filter(fn (mixed $title): bool => is_string($title) && $title !== '')
                ->values()
                ->all(),
            'text' => $this->isEmptyScalar($value['text'] ?? null)
                ? []
                : [(string) $value['text']],
            'time' => $this->isEmptyScalar($value['time'] ?? null)
                ? []
                : [(string) $value['time']],
            'choice' => $this->isEmptyScalar($value['value'] ?? null)
                ? []
                : [(string) $value['value']],
            default => [],
        };
    }

    private function timeFromAnswer(?PlanAnswerVersion $version): ?string
    {
        if ($version === null) {
            return null;
        }

        $time = $version->value_json['time'] ?? null;

        return $this->isEmptyScalar($time) ? null : substr((string) $time, 0, 5);
    }

    private function choiceFromAnswer(?PlanAnswerVersion $version): ?string
    {
        if ($version === null) {
            return null;
        }

        $value = $version->value_json['value'] ?? null;

        return $this->isEmptyScalar($value) ? null : (string) $value;
    }

    private function decidedWithLabel(?PlanAnswerVersion $version): ?string
    {
        if ($version === null || $version->decided_with_member_id === null) {
            return null;
        }

        if ($this->titlesFromAnswer($version) === []) {
            return null;
        }

        return $version->decided_with_member_id === FamilyMemberResolver::motherId()
            ? 'mama'
            : null;
    }

    /**
     * @param  Collection<string, PlanAnswerVersion>  $latestByKey
     */
    private function startDecidedWithLabel(DailyPlan $plan, Collection $latestByKey): ?string
    {
        $questionKey = $plan->mode === 'summer' ? 'wake_up_time' : 'school_start_period';
        $answer = $latestByKey->get($questionKey);

        if ($questionKey === 'wake_up_time' && $this->timeFromAnswer($answer) === null) {
            return null;
        }

        if ($questionKey === 'school_start_period' && $this->choiceFromAnswer($answer) === null) {
            return null;
        }

        return $this->decidedWithLabel($answer);
    }

    private function deterministicItemId(int $versionId, int $index): int
    {
        return ($versionId * 1000) + $index;
    }

    public function formatDateTime(\DateTimeInterface $dateTime): string
    {
        return CarbonImmutable::instance($dateTime)
            ->timezone(JstDate::TIMEZONE)
            ->toIso8601String();
    }
}
