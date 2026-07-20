<?php

namespace Database\Seeders;

use App\Models\DailyPlan;
use App\Models\PlanAnswerVersion;
use App\Models\PlanQuestion;
use App\Services\Musume\MusumePlanService;
use App\Support\FamilyMemberResolver;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * migrate:fresh で消えた娘の日次見通しを復元する。
 *
 * 2026-07-18〜20 の起床・日中の予定・就寝。
 * 二重実行しても同一質問へ追記しない（既存回答がある日はスキップ）。
 */
class MusumeHistoricalPlanSeeder extends Seeder
{
    /**
     * 各日の実績。wake_up / tomorrow_plan は前日プランへも載せる。
     *
     * @var list<array{
     *     date: string,
     *     wake_up_time: string,
     *     today_task: string,
     *     bedtime: ?string
     * }>
     */
    private const DAYS = [
        [
            'date' => '2026-07-18',
            'wake_up_time' => '07:00',
            'today_task' => '友達と遊ぶ',
            'bedtime' => '23:30',
        ],
        [
            'date' => '2026-07-19',
            'wake_up_time' => '08:00',
            'today_task' => '友達と夏祭り',
            'bedtime' => '00:30',
        ],
        [
            'date' => '2026-07-20',
            'wake_up_time' => '09:00',
            'today_task' => '友達と夏祭り',
            'bedtime' => null,
        ],
    ];

    public function run(): void
    {
        FamilyMemberResolver::childId();

        $service = app(MusumePlanService::class);

        DB::transaction(function () use ($service): void {
            foreach (self::DAYS as $day) {
                $this->seedDay($service, $day);
            }
        });
    }

    /**
     * @param  array{
     *     date: string,
     *     wake_up_time: string,
     *     today_task: string,
     *     bedtime: ?string
     * }  $day
     */
    private function seedDay(MusumePlanService $service, array $day): void
    {
        $planDate = $day['date'];
        $previousDate = date('Y-m-d', strtotime($planDate.' -1 day'));

        $previousPlanId = $service->getOrCreatePlan($previousDate)['plan']['id'];
        $planId = $service->getOrCreatePlan($planDate)['plan']['id'];

        DailyPlan::query()->whereKey([$previousPlanId, $planId])->update(['mode' => 'summer']);

        if (! $this->hasAnswer($previousPlanId, 'wake_up_time')) {
            $service->updatePlan($previousPlanId, [
                'wake_up_time' => $day['wake_up_time'],
            ]);
        }

        if (! $this->hasAnswer($previousPlanId, 'tomorrow_plan')) {
            $service->replaceItems($previousPlanId, 'tomorrow_plan', [$day['today_task']]);
        }

        if (! $this->hasAnswer($planId, 'today_task')) {
            $service->replaceItems($planId, 'today_task', [$day['today_task']]);
        }

        if ($day['bedtime'] !== null && ! $this->hasAnswer($planId, 'bedtime')) {
            $service->updatePlan($planId, [
                'bedtime' => $day['bedtime'],
            ]);
        }
    }

    private function hasAnswer(int $planId, string $questionKey): bool
    {
        $questionId = PlanQuestion::query()
            ->where('question_key', $questionKey)
            ->value('id');

        if ($questionId === null) {
            return false;
        }

        return PlanAnswerVersion::query()
            ->where('daily_plan_id', $planId)
            ->where('question_id', $questionId)
            ->exists();
    }
}
