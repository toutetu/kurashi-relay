<?php

namespace App\Data;

/**
 * @deprecated Product Phase 以降は DashboardService が DB/サービスから組み立てる。
 *             固定ダミーはレガシー参照・テスト用に残すのみ。新規利用禁止。
 */
final class DashboardFixture
{
    /**
     * @return array<string, mixed>
     */
    public function forDate(string $date): array
    {
        return [
            'date' => $date,
            'currentActivity' => [
                'id' => 'activity-001',
                'title' => '登校支援',
                'category' => 'school_support',
                'startedAt' => $this->at($date, '08:12:00'),
                'status' => 'running',
                'relatedPlanTitle' => '娘の登校準備',
            ],
            'nextPlans' => [
                [
                    'id' => 'plan-001',
                    'startAt' => $this->at($date, '11:30:00'),
                    'endAt' => $this->at($date, '12:30:00'),
                    'title' => '学校への送迎・引き渡し',
                    'category' => 'school_support',
                    'source' => 'manual',
                    'status' => 'planned',
                ],
                [
                    'id' => 'plan-002',
                    'startAt' => $this->at($date, '13:00:00'),
                    'endAt' => $this->at($date, '15:00:00'),
                    'title' => '在宅訓練',
                    'category' => 'work_preparation',
                    'source' => 'google',
                    'status' => 'planned',
                ],
                [
                    'id' => 'plan-003',
                    'startAt' => $this->at($date, '17:30:00'),
                    'endAt' => $this->at($date, '18:00:00'),
                    'title' => '買い物',
                    'category' => 'housework',
                    'source' => 'manual',
                    'status' => 'planned',
                ],
            ],
            'quickLogs' => [
                ['type' => 'wake_prompt', 'label' => '起床の声かけ', 'count' => 3],
                ['type' => 'change_clothes_prompt', 'label' => '着替えの声かけ', 'count' => 2],
                ['type' => 'school_contact', 'label' => '学校へ連絡', 'count' => 1],
                ['type' => 'stomachache_support', 'label' => '腹痛対応', 'count' => 1],
                ['type' => 'transport', 'label' => '自転車で送迎', 'count' => 0],
                ['type' => 'school_handoff', 'label' => '引き渡し完了', 'count' => 0],
            ],
            'conditions' => [
                'mother' => [
                    'physical' => 3,
                    'mood' => 2,
                    'inputSource' => 'self',
                ],
                'daughter' => [
                    'physical' => 3,
                    'mood' => 3,
                    'inputSource' => 'guardian_observation',
                ],
            ],
            'childStrategy' => [
                'desiredOutcome' => '短時間なら学校へ行きたい',
                'firstStep' => '朝食を食べる',
                'requestedSupports' => [
                    '11時30分ごろの登校にしてほしい',
                    '強く急かさないでほしい',
                ],
                'fallbackPlans' => [
                    '30分後にもう一度考える',
                    '難しい場合は休む',
                ],
                'confidence' => 'slightly_anxious',
                'note' => '',
            ],
            'timeBalance' => [
                'sleepMinutes' => 435,
                'waitingMinutes' => 130,
                'activityMinutes' => 225,
                'recoveryMinutes' => 80,
            ],
            'scheduleImpactSummary' => [
                'onScheduleCount' => 1,
                'delayedCount' => 1,
                'interruptedCount' => 0,
                'cancelledCount' => 1,
                'movedToNightCount' => 0,
                'lostMinutes' => 130,
                'mainCauses' => [
                    ['label' => '登校支援', 'minutes' => 60],
                    ['label' => '待機・拘束', 'minutes' => 50],
                    ['label' => '回復・休息', 'minutes' => 20],
                ],
            ],
            'actionItems' => [
                [
                    'id' => 'action-001',
                    'title' => '学校との面談の持ち物を確認する',
                    'assignee' => '母',
                    'dueAt' => $this->at($date, '09:30:00'),
                    'status' => 'not_started',
                    'priority' => 'high',
                ],
                [
                    'id' => 'action-002',
                    'title' => '祖父母の次回宿泊日を相談支援へ確認する',
                    'assignee' => '相談支援',
                    'dueAt' => $this->at($date, '17:00:00', 3),
                    'status' => 'coordinating',
                    'priority' => 'medium',
                ],
                [
                    'id' => 'action-003',
                    'title' => '夕食の準備',
                    'assignee' => '母',
                    'dueAt' => $this->at($date, '17:30:00'),
                    'status' => 'not_started',
                    'priority' => 'medium',
                ],
            ],
            'lastWar' => [
                'gameName' => 'ラストウォー',
                'plannedTasks' => ['デイリーミッション', '連盟タスク', '資源回収'],
                'completedCount' => 2,
                'totalCount' => 3,
                'playMinutes' => 35,
                'recoveryEffect' => 4,
            ],
            'scheduleComparisons' => $this->scheduleComparisons($date),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function scheduleComparisons(string $date): array
    {
        return [
            [
                'timeRange' => [
                    'start' => $this->at($date, '08:00:00'),
                    'end' => $this->at($date, '09:00:00'),
                ],
                'plan' => [
                    'id' => 'plan-101',
                    'title' => '登校支援',
                    'startAt' => $this->at($date, '08:00:00'),
                    'endAt' => $this->at($date, '09:00:00'),
                    'category' => 'school_support',
                    'details' => ['起床の声かけ', '着替えの声かけ', '学校への送迎・引き渡し'],
                ],
                'actuals' => [
                    [
                        'id' => 'entry-101',
                        'title' => '登校支援',
                        'kind' => 'activity',
                        'category' => 'school_support',
                        'startAt' => $this->at($date, '08:10:00'),
                        'endAt' => $this->at($date, '09:00:00'),
                        'details' => ['起床の声かけ', '着替えの声かけ', '学校への送迎・引き渡し'],
                    ],
                ],
                'difference' => [
                    'status' => 'delayed',
                    'startDelayMinutes' => 10,
                    'plannedMinutes' => 60,
                    'actualMinutes' => 50,
                    'interruptionCount' => 0,
                    'lostMinutes' => 10,
                    'causes' => ['起床・準備に時間'],
                ],
            ],
            [
                'timeRange' => [
                    'start' => $this->at($date, '09:00:00'),
                    'end' => $this->at($date, '10:00:00'),
                ],
                'plan' => null,
                'actuals' => [
                    [
                        'id' => 'entry-102',
                        'title' => '家事',
                        'kind' => 'activity',
                        'category' => 'housework',
                        'startAt' => $this->at($date, '09:10:00'),
                        'endAt' => $this->at($date, '09:50:00'),
                        'details' => ['洗濯', '掃除機がけ', '片付け'],
                    ],
                ],
                'difference' => [
                    'status' => 'unplanned_activity',
                    'startDelayMinutes' => 0,
                    'plannedMinutes' => 0,
                    'actualMinutes' => 40,
                    'interruptionCount' => 0,
                    'lostMinutes' => 0,
                    'causes' => ['隙間時間を有効活用'],
                ],
            ],
            [
                'timeRange' => [
                    'start' => $this->at($date, '10:00:00'),
                    'end' => $this->at($date, '12:00:00'),
                ],
                'plan' => [
                    'id' => 'plan-102',
                    'title' => '在宅訓練',
                    'startAt' => $this->at($date, '10:00:00'),
                    'endAt' => $this->at($date, '12:00:00'),
                    'category' => 'work_preparation',
                    'details' => ['ポートフォリオ制作'],
                ],
                'actuals' => [
                    [
                        'id' => 'entry-103',
                        'title' => '腹痛対応・待機',
                        'kind' => 'waiting',
                        'category' => 'stomachache_toilet_wait',
                        'startAt' => $this->at($date, '10:00:00'),
                        'endAt' => $this->at($date, '10:40:00'),
                        'details' => ['娘の腹痛対応', 'トイレ待機'],
                    ],
                    [
                        'id' => 'entry-104',
                        'title' => '回復・休息',
                        'kind' => 'recovery',
                        'category' => 'after_school_support',
                        'startAt' => $this->at($date, '10:40:00'),
                        'endAt' => $this->at($date, '11:10:00'),
                        'details' => ['気持ちを整える'],
                    ],
                ],
                'difference' => [
                    'status' => 'cancelled',
                    'startDelayMinutes' => 0,
                    'plannedMinutes' => 120,
                    'actualMinutes' => 0,
                    'interruptionCount' => 0,
                    'lostMinutes' => 120,
                    'causes' => ['娘の腹痛対応', '待機・拘束', '回復'],
                ],
            ],
            [
                'timeRange' => [
                    'start' => $this->at($date, '12:00:00'),
                    'end' => $this->at($date, '13:00:00'),
                ],
                'plan' => null,
                'actuals' => [],
                'difference' => [
                    'status' => 'no_plan_no_record',
                    'startDelayMinutes' => 0,
                    'plannedMinutes' => 0,
                    'actualMinutes' => 0,
                    'interruptionCount' => 0,
                    'lostMinutes' => 0,
                    'causes' => [],
                ],
            ],
            [
                'timeRange' => [
                    'start' => $this->at($date, '13:00:00'),
                    'end' => $this->at($date, '15:00:00'),
                ],
                'plan' => [
                    'id' => 'plan-103',
                    'title' => '在宅訓練',
                    'startAt' => $this->at($date, '13:00:00'),
                    'endAt' => $this->at($date, '15:00:00'),
                    'category' => 'work_preparation',
                    'details' => ['ポートフォリオ制作'],
                ],
                'actuals' => [
                    [
                        'id' => 'entry-105',
                        'title' => '在宅訓練',
                        'kind' => 'activity',
                        'category' => 'work_preparation',
                        'startAt' => $this->at($date, '13:00:00'),
                        'endAt' => $this->at($date, '15:00:00'),
                        'details' => ['ポートフォリオ制作'],
                    ],
                ],
                'difference' => [
                    'status' => 'on_schedule',
                    'startDelayMinutes' => 0,
                    'plannedMinutes' => 120,
                    'actualMinutes' => 120,
                    'interruptionCount' => 0,
                    'lostMinutes' => 0,
                    'causes' => [],
                ],
            ],
        ];
    }

    private function at(string $date, string $time, int $daysAfter = 0): string
    {
        if ($daysAfter > 0) {
            $date = (new \DateTimeImmutable($date, new \DateTimeZone('Asia/Tokyo')))
                ->modify("+{$daysAfter} days")
                ->format('Y-m-d');
        }

        return "{$date}T{$time}+09:00";
    }
}
