<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\ActivityEventNote;
use App\Models\FamilyMember;
use App\Models\TaskDefinition;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class ActivityEventRecordQuery
{
    /**
     * @return Collection<int, ActivityEvent>
     */
    public function activityEventsForActorOnDate(FamilyMember $member, string $tokyoDate): Collection
    {
        [$startUtc, $endUtc] = $this->tokyoDayBoundsUtc($tokyoDate);

        return ActivityEvent::query()
            ->with(['activityDefinition'])
            ->where('event_type', 'activity')
            ->where('actor_member_id', $member->id)
            ->whereBetween('occurred_at', [$startUtc, $endUtc])
            ->whereDoesntHave('cancellation')
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * @return array<int, int> activity_definition_id => count
     */
    public function activityCountsByDefinitionForActorOnDate(
        FamilyMember $member,
        string $tokyoDate,
    ): array {
        return $this->activityEventsForActorOnDate($member, $tokyoDate)
            ->groupBy('activity_definition_id')
            ->map(fn (Collection $group): int => $group->count())
            ->all();
    }

    public function activityCountForActorOnDate(FamilyMember $member, string $tokyoDate): int
    {
        return $this->activityEventsForActorOnDate($member, $tokyoDate)->count();
    }

    /**
     * @param  Collection<int, ActivityEvent>  $events
     * @return list<array{
     *     id: int,
     *     member: string,
     *     task: string,
     *     task_title: string,
     *     record_date: string,
     *     completed_at: string,
     *     cancelled_at: null
     * }>
     */
    public function toTimelineRecords(
        FamilyMember $member,
        string $tokyoDate,
        Collection $events,
    ): array {
        $taskDefinitions = TaskDefinition::query()
            ->where('owner_role', $member->role)
            ->whereNotNull('activity_definition_id')
            ->get()
            ->keyBy('activity_definition_id');

        $eventIds = $events->pluck('id')->all();

        $notesByEventId = $eventIds === []
            ? collect()
            : ActivityEventNote::query()
                ->whereIn('activity_event_id', $eventIds)
                ->pluck('note', 'activity_event_id');

        return $events->map(function (ActivityEvent $event) use (
            $member,
            $tokyoDate,
            $taskDefinitions,
            $notesByEventId,
        ): array {
            /** @var TaskDefinition|null $taskDefinition */
            $taskDefinition = $taskDefinitions->get($event->activity_definition_id);
            $activity = $event->activityDefinition;
            $note = null;

            $rawNote = $notesByEventId->get($event->id);
            if (is_string($rawNote) && trim($rawNote) !== '') {
                $note = trim($rawNote);
            }

            return [
                'id' => $event->id,
                'member' => $member->role,
                'task' => $taskDefinition?->slug ?? $activity?->activity_key ?? 'activity',
                'task_title' => $note
                    ?? $taskDefinition?->title
                    ?? $activity?->name
                    ?? '活動',
                'record_date' => $tokyoDate,
                'completed_at' => $event->occurred_at
                    ->timezone('Asia/Tokyo')
                    ->toIso8601String(),
                'cancelled_at' => null,
                'note' => $note,
            ];
        })->values()->all();
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function tokyoDayBoundsUtc(string $tokyoDate): array
    {
        $start = CarbonImmutable::parse($tokyoDate, 'Asia/Tokyo')->startOfDay()->utc();
        $end = CarbonImmutable::parse($tokyoDate, 'Asia/Tokyo')->endOfDay()->utc();

        return [$start, $end];
    }
}
