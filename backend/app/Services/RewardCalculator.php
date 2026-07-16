<?php

namespace App\Services;

use App\Models\FamilyMember;
use App\Models\RewardAdjustment;
use App\Models\RewardCollection;
use App\Models\TaskRecord;

final class RewardCalculator
{
    public function summary(FamilyMember $member, string $date): array
    {
        $stampSize = (int) config('kurashi.stamp_size', 10);
        $activeRecordCount = $this->activeRecordCount($member);
        $gaugeAdjustment = $this->adjustmentSum($member, 'gauge');
        $lifetimeCount = $activeRecordCount + $gaugeAdjustment;
        $gaugeCount = (($lifetimeCount % $stampSize) + $stampSize) % $stampSize;
        $fullCount = intdiv($lifetimeCount - $gaugeCount, $stampSize);
        $todayDoneCount = TaskRecord::query()
            ->where('family_member_id', $member->id)
            ->whereNull('cancelled_at')
            ->whereDate('record_date', $date)
            ->count();
        $collectionsCount = RewardCollection::query()
            ->where('family_member_id', $member->id)
            ->count();

        $summary = [
            'member' => $member->role,
            'date' => $date,
            'today_done_count' => $todayDoneCount,
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
