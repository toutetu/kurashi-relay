<?php

namespace App\Services;

use App\Models\ActivityEvent;
use App\Models\FamilyMember;
use App\Models\RewardAdjustment;
use App\Models\RewardCollection;
use App\Models\RewardTransaction;

final class RewardCalculator
{
    public function __construct(
        private readonly ActivityEventRecordQuery $activityEventRecordQuery,
    ) {}

    public function summary(FamilyMember $member, string $date): array
    {
        $stampSize = (int) config('kurashi.stamp_size', 10);
        $activeRecordCount = $this->activeOshigotoCount($member);
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
            $ledgerPoints = (int) RewardTransaction::query()
                ->where('member_id', $member->id)
                ->where('kind', 'point')
                ->sum('amount');

            $summary['coins'] = null;
            $summary['points'] = $ledgerPoints + $pointAdjustment;
        }

        return $summary;
    }

    private function todayDoneCount(FamilyMember $member, string $date): int
    {
        // 活動回数の正本は activity_events のみ（DR-050）。
        return $this->activityEventRecordQuery
            ->activityCountForActorOnDate($member, $date);
    }

    private function activeOshigotoCount(FamilyMember $member): int
    {
        // ゲージに乗るのはおしごとだけ（声かけ完了は含めない）。DR-051。
        return ActivityEvent::query()
            ->where('event_type', 'activity')
            ->where('source', 'oshigoto')
            ->where('actor_member_id', $member->id)
            ->whereDoesntHave('cancellation')
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
