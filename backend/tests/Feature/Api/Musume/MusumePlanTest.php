<?php

namespace Tests\Feature\Api\Musume;

use App\Models\DailyPlan;
use App\Models\ReflectionSession;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MusumePlanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_get_plan_lazy_generates_once_per_date(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $first = $this->getJson('/api/musume/plan?date=2026-07-18');
        $first->assertOk()
            ->assertJsonPath('plan.plan_date', '2026-07-18')
            ->assertJsonPath('plan.mode', 'summer');

        $this->assertSame(1, DailyPlan::query()->where('plan_date', '2026-07-18')->count());

        $second = $this->getJson('/api/musume/plan?date=2026-07-18');
        $second->assertOk()
            ->assertJsonPath('plan.id', $first->json('plan.id'));

        $this->assertSame(1, DailyPlan::query()->where('plan_date', '2026-07-18')->count());
    }

    public function test_mode_inherits_from_previous_plan(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-17 08:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/musume/plan?date=2026-07-17')
            ->assertOk()
            ->assertJsonPath('plan.mode', 'summer');

        DailyPlan::query()
            ->where('plan_date', '2026-07-17')
            ->update(['mode' => 'school']);

        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->assertJsonPath('plan.mode', 'school');
    }

    public function test_replace_items_updates_state_for_today_task_and_tomorrow_item(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'today_task',
            'titles' => ['夏休みの宿題', '遊ぶ'],
        ])
            ->assertOk()
            ->assertJsonPath('plan.today_state', 'decided')
            ->assertJsonCount(2, 'plan.items.today_task')
            ->assertJsonPath('plan.items.today_task.0.title', '夏休みの宿題')
            ->assertJsonPath('plan.items.today_task.1.title', '遊ぶ');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'today_task',
            'titles' => [],
        ])
            ->assertOk()
            ->assertJsonPath('plan.today_state', 'undecided')
            ->assertJsonCount(0, 'plan.items.today_task');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'tomorrow_item',
            'titles' => ['水筒'],
        ])
            ->assertOk()
            ->assertJsonPath('plan.tomorrow_items_state', 'decided');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'tomorrow_item',
            'titles' => [],
        ])
            ->assertOk()
            ->assertJsonPath('plan.tomorrow_items_state', 'undecided');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'memo',
            'titles' => ['メモ'],
        ])
            ->assertOk()
            ->assertJsonPath('plan.today_state', 'undecided')
            ->assertJsonCount(1, 'plan.items.memo');
    }

    public function test_patch_can_set_with_mama_state(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'today_state' => 'with_mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.today_state', 'with_mama');
    }

    public function test_patch_wake_up_time_sets_start_state_decided(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => '07:30',
        ])
            ->assertOk()
            ->assertJsonPath('plan.wake_up_time', '07:30')
            ->assertJsonPath('plan.start_state', 'decided');
    }

    public function test_reflection_complete_is_idempotent(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $first = $this->postJson("/api/musume/plan/{$planId}/reflection/complete", [
            'mode' => 'summer',
            'note' => null,
        ]);
        $first->assertOk()
            ->assertJsonPath('plan.review.mode', 'summer')
            ->assertJsonPath('plan.review.completed_at', '2026-07-18T20:00:00+09:00');

        $this->assertSame(1, ReflectionSession::query()->where('daily_plan_id', $planId)->count());
        $this->assertNotNull(
            DailyPlan::query()->findOrFail($planId)->review_completed_at
        );

        Carbon::setTestNow(Carbon::parse('2026-07-18 20:05:00', 'Asia/Tokyo'));

        $second = $this->postJson("/api/musume/plan/{$planId}/reflection/complete", [
            'mode' => 'summer',
            'note' => null,
        ]);
        $second->assertOk()
            ->assertJsonPath('plan.review.completed_at', '2026-07-18T20:00:00+09:00');

        $this->assertSame(1, ReflectionSession::query()->where('daily_plan_id', $planId)->count());
        $this->assertSame(
            '2026-07-18T20:00:00+09:00',
            DailyPlan::query()->findOrFail($planId)->review_completed_at?->timezone('Asia/Tokyo')->toIso8601String(),
        );
    }

    public function test_musume_summary_returns_null_when_plan_missing_without_generation(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/koekake/musume-summary?date=2026-07-18')
            ->assertOk()
            ->assertExactJson(['summary' => null]);

        $this->assertSame(0, DailyPlan::query()->where('plan_date', '2026-07-18')->count());
    }

    public function test_musume_summary_returns_plan_content_when_exists(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'today_task',
            'titles' => ['夏休みの宿題'],
        ])->assertOk();

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => '07:30',
        ])->assertOk();

        $this->postJson("/api/musume/plan/{$planId}/reflection/complete", [
            'mode' => 'summer',
            'note' => null,
        ])->assertOk();

        $this->getJson('/api/koekake/musume-summary?date=2026-07-18')
            ->assertOk()
            ->assertJsonPath('summary.mode', 'summer')
            ->assertJsonPath('summary.today_tasks', ['夏休みの宿題'])
            ->assertJsonPath('summary.wake_up_time', '07:30')
            ->assertJsonPath('summary.today_state', 'decided')
            ->assertJsonPath('summary.start_state', 'decided')
            ->assertJsonPath('summary.review_completed_at', '2026-07-18T08:00:00+09:00');
    }

    public function test_anytime_phase_returns_empty_tasks(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/koekake/tasks?date=2026-07-18&phase=anytime')
            ->assertOk()
            ->assertJsonPath('date', '2026-07-18')
            ->assertJsonCount(0, 'tasks');
    }
}
