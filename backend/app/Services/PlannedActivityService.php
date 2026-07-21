<?php

namespace App\Services;

use App\Models\ActivityDefinition;
use App\Models\FamilyMember;
use App\Models\PlannedActivity;
use App\Support\FamilyMemberResolver;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Str;

final class PlannedActivityService
{
    /**
     * @return Collection<int, PlannedActivity>
     */
    public function listForDate(string $localDate, ?string $subjectRole = null): Collection
    {
        $query = PlannedActivity::query()
            ->with(['activityDefinition', 'subjectMember'])
            ->whereDate('local_date', $localDate)
            ->where('status', '!=', 'cancelled')
            ->orderByRaw('planned_start_at IS NULL')
            ->orderBy('planned_start_at')
            ->orderBy('id');

        if ($subjectRole !== null) {
            $memberId = $subjectRole === 'mother'
                ? FamilyMemberResolver::motherId()
                : FamilyMemberResolver::childId();
            $query->where('subject_member_id', $memberId);
        }

        return $query->get();
    }

    /**
     * ホーム「きょうのようす」用。実施せず(cancelled)も表示のため含める。
     *
     * @return Collection<int, PlannedActivity>
     */
    public function listForHomeDate(string $localDate): Collection
    {
        return PlannedActivity::query()
            ->with([
                'activityDefinition',
                'subjectMember',
                'planActualLinks' => fn ($q) => $q->where('link_type', 'primary'),
                'planActualLinks.activityEvent.cancellation',
            ])
            ->whereDate('local_date', $localDate)
            ->orderByRaw('planned_start_at IS NULL')
            ->orderBy('planned_start_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  array{
     *   subject: string,
     *   title: string,
     *   local_date: string,
     *   activity_definition_id?: int|null,
     *   planned_start_at?: string|null,
     *   planned_end_at?: string|null,
     *   is_all_day?: bool,
     *   category_snapshot?: string|null
     * }  $input
     */
    public function create(array $input): PlannedActivity
    {
        $subject = $this->findMember($input['subject']);
        $definition = $this->resolveDefinition($input['activity_definition_id'] ?? null);
        $title = $input['title'];
        $category = $input['category_snapshot'] ?? $definition?->category;

        if ($definition !== null && $title === '') {
            $title = $definition->name;
        }

        $activity = PlannedActivity::query()->create([
            'subject_member_id' => $subject->id,
            'activity_definition_id' => $definition?->id,
            'source_type' => 'manual',
            'source_key' => 'manual:'.Str::uuid()->toString(),
            'title_snapshot' => $title,
            'category_snapshot' => $category,
            'planned_start_at' => $this->parseOptionalDateTime($input['planned_start_at'] ?? null),
            'planned_end_at' => $this->parseOptionalDateTime($input['planned_end_at'] ?? null),
            'is_all_day' => (bool) ($input['is_all_day'] ?? false),
            'local_date' => $input['local_date'],
            'status' => 'planned',
            'routine_template_id' => null,
            'plan_answer_version_id' => null,
            'calendar_event_version_id' => null,
        ]);

        return $activity->load(['activityDefinition', 'subjectMember']);
    }

    /**
     * @param  array{
     *   title?: string,
     *   local_date?: string,
     *   activity_definition_id?: int|null,
     *   planned_start_at?: string|null,
     *   planned_end_at?: string|null,
     *   is_all_day?: bool,
     *   category_snapshot?: string|null
     * }  $input
     */
    public function update(int $id, array $input): PlannedActivity
    {
        $activity = $this->findEditable($id);

        if (array_key_exists('activity_definition_id', $input)) {
            $definition = $this->resolveDefinition($input['activity_definition_id']);
            $activity->activity_definition_id = $definition?->id;
            if ($definition !== null && ! array_key_exists('category_snapshot', $input)) {
                $activity->category_snapshot = $definition->category;
            }
        }

        if (array_key_exists('title', $input) && is_string($input['title'])) {
            $activity->title_snapshot = $input['title'];
        }

        if (array_key_exists('category_snapshot', $input)) {
            $activity->category_snapshot = $input['category_snapshot'];
        }

        if (array_key_exists('local_date', $input) && is_string($input['local_date'])) {
            $activity->local_date = $input['local_date'];
        }

        if (array_key_exists('planned_start_at', $input)) {
            $activity->planned_start_at = $this->parseOptionalDateTime($input['planned_start_at']);
        }

        if (array_key_exists('planned_end_at', $input)) {
            $activity->planned_end_at = $this->parseOptionalDateTime($input['planned_end_at']);
        }

        if (array_key_exists('is_all_day', $input)) {
            $activity->is_all_day = (bool) $input['is_all_day'];
        }

        $activity->status = 'changed';
        $activity->save();

        return $activity->load(['activityDefinition', 'subjectMember']);
    }

    public function cancel(int $id): PlannedActivity
    {
        $activity = $this->findEditable($id);
        $activity->status = 'cancelled';
        $activity->save();

        return $activity->load(['activityDefinition', 'subjectMember']);
    }

    /**
     * @return Collection<int, ActivityDefinition>
     */
    public function listActivityOptions(): Collection
    {
        return ActivityDefinition::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    private function findEditable(int $id): PlannedActivity
    {
        $activity = PlannedActivity::query()->find($id);

        if ($activity === null || $activity->status === 'cancelled') {
            throw (new ModelNotFoundException)->setModel(PlannedActivity::class, [$id]);
        }

        if ($activity->source_type !== 'manual') {
            abort(422, 'むすめの見通しや外部予定はここでは変更できません。');
        }

        return $activity;
    }

    private function findMember(string $role): FamilyMember
    {
        $member = FamilyMember::query()->where('role', $role)->first();

        if ($member === null) {
            throw (new ModelNotFoundException)->setModel(FamilyMember::class);
        }

        return $member;
    }

    private function resolveDefinition(mixed $id): ?ActivityDefinition
    {
        if ($id === null || $id === '') {
            return null;
        }

        $definition = ActivityDefinition::query()
            ->whereKey((int) $id)
            ->where('is_active', true)
            ->first();

        if ($definition === null) {
            throw (new ModelNotFoundException)->setModel(ActivityDefinition::class, [(int) $id]);
        }

        return $definition;
    }

    private function parseOptionalDateTime(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        return CarbonImmutable::parse($value)->timezone('Asia/Tokyo');
    }
}
