<?php

namespace App\Services;

use App\Models\FamilyMember;
use App\Models\RewardAdjustment;
use App\Models\RewardCollection;
use App\Models\TaskRecord;

final class RewardCalculator
{
    public function __construct(
        private readonly ActivityEventRecordQuery $activityEventRecordQuery,
    ) {}

    public function summary(FamilyMember $member, string $date): array
    {
        $stampSize = (int) config('kurashi.stamp_size', 10);
        $activeRecordCount = $this->activeRecordCount($member);
        $gaugeAdjustment = $this->adjustmentSum($member, 'gauge');
        $lifetimeCount = $activeRecordCount + $gaugeAdjustment;
        $gaugeCount = (($lifetimeCount % $stampSize) + $stampSize) % $stampSize;
        $fullCount = intdiv($lifetimeCount - $gaugeCount, $stampSize);
        $collectionsCount = RewardCollection::query()
            ->where('family_member_id', $member->id)
            ->count();

        $summary = [
            'member' => $member->role,
            'date' => $date,
            'today_done_count' => $this->todayDoneCount($member, $date),
            'lifetime_count' => $lifetimeCount,
            'gauge_count' => $gaugeCount,
            'gauge_size' => $stampSize,
            'full_count' => $fullCount,
            'collections_count' => $collectionsCount,
        ];

        if ($member->role === 'child') {
            $coinAdjustment = $this->adjustmentSum($member, 'coin');

            $summary['coins'] = ($fullCount * (int) config('kurashi.coin_per_full_moon', 100)) + $coinAdjustment;
            $summary['points'] = null;
        } else {
            $pointAdjustment = $this->adjustmentSum($member, 'point');
            $recordPoints = (int) TaskRecord::query()
                ->where('family_member_id', $member->id)
                ->whereNull('cancelled_at')
                ->sum('granted_point_value');

            $summary['coins'] = null;
            $summary['points'] = $recordPoints + $pointAdjustment;
        }

        return $summary;
    }

    private function todayDoneCount(FamilyMember $member, string $date): int
    {
        $events = $this->activityEventRecordQuery->activityEventsForActorOnDate($member, $date);
        $eventKeys = $events
            ->pluck('idempotency_key')
            ->all();

        $orphanTaskRecordCount = TaskRecord::query()
            ->where('family_member_id', $member->id)
            ->whereNull('cancelled_at')
            ->whereDate('record_date', $date)
            ->get()
            ->filter(function (TaskRecord $record) use ($eventKeys): bool {
                return ! in_array(
                    TaskRecordService::activityEventIdempotencyKey($record->idempotency_key),
                    $eventKeys,
                    true,
                );
            })
            ->count();

        return $events->count() + $orphanTaskRecordCount;
    }

    private function activeRecordCount(FamilyMember $member): int
    {
        return TaskRecord::query()
            ->where('family_member_id', $member->id)
            ->whereNull('cancelled_at')
            ->count();
    }

    private function adjustmentSum(FamilyMember $member, string $kind): int
    {
        return (int) RewardAdjustment::query()
            ->where('family_member_id', $member->id)
            ->where('kind', $kind)
            ->sum('amount');
    }
}
