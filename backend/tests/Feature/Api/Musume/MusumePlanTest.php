<?php

namespace Tests\Feature\Api\Musume;

use App\Models\DailyPlan;
use App\Models\ReflectionSession;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
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
            ->assertJsonPath('plan.mode', 'summer')
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('plan.items.tomorrow_plan')
                ->where('plan.items.tomorrow_plan', []));

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

    public function test_replace_items_persists_today_task_and_tomorrow_item(): void
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
            ->assertJsonCount(2, 'plan.items.today_task')
            ->assertJsonPath('plan.items.today_task.0.title', '夏休みの宿題')
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('plan.items.today_task.0.decided_with')
                ->where('plan.items.today_task.0.decided_with', null))
            ->assertJsonPath('plan.items.today_task.1.title', '遊ぶ');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'today_task',
            'titles' => [],
        ])
            ->assertOk()
            ->assertJsonCount(0, 'plan.items.today_task');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'tomorrow_item',
            'titles' => ['水筒'],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'plan.items.tomorrow_item')
            ->assertJsonPath('plan.items.tomorrow_item.0.title', '水筒');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'tomorrow_item',
            'titles' => [],
        ])
            ->assertOk()
            ->assertJsonCount(0, 'plan.items.tomorrow_item');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'memo',
            'titles' => ['メモ'],
        ])
            ->assertOk()
            ->assertJsonCount(0, 'plan.items.today_task')
            ->assertJsonCount(1, 'plan.items.memo');
    }

    public function test_replace_items_persists_tomorrow_plan_category(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'tomorrow_plan',
            'titles' => ['友達と遊ぶ', 'ゆっくりする'],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'plan.items.tomorrow_plan')
            ->assertJsonPath('plan.items.tomorrow_plan.0.title', '友達と遊ぶ');

        $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->assertJsonCount(2, 'plan.items.tomorrow_plan')
            ->assertJsonPath('plan.items.tomorrow_plan.1.title', 'ゆっくりする');
    }

    public function test_replace_items_persists_decided_with_on_all_rows(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'today_task',
            'titles' => ['夏休みの宿題', '遊ぶ'],
            'decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.items.today_task.0.decided_with', 'mama')
            ->assertJsonPath('plan.items.today_task.1.decided_with', 'mama');

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'today_task',
            'titles' => ['自分で決めた'],
        ])
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('plan.items.today_task.0.decided_with')
                ->where('plan.items.today_task.0.decided_with', null));
    }

    public function test_clearing_wake_up_time_clears_start_decided_with(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => '07:30',
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.wake_up_time', '07:30')
            ->assertJsonPath('plan.start_decided_with', 'mama');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => null,
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('plan.wake_up_time')
                ->where('plan.wake_up_time', null)
                ->has('plan.start_decided_with')
                ->where('plan.start_decided_with', null));
    }

    public function test_start_decided_with_stays_consistent_across_mode_switches(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'mode' => 'school',
            'school_start_period' => 'first_period',
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.mode', 'school')
            ->assertJsonPath('plan.school_start_period', 'first_period')
            ->assertJsonPath('plan.start_decided_with', 'mama');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'mode' => 'summer',
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.mode', 'summer')
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('plan.start_decided_with')
                ->where('plan.start_decided_with', null));

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => '07:00',
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.wake_up_time', '07:00')
            ->assertJsonPath('plan.start_decided_with', 'mama');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'mode' => 'school',
            'school_start_period' => null,
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.mode', 'school')
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('plan.school_start_period')
                ->where('plan.school_start_period', null)
                ->has('plan.start_decided_with')
                ->where('plan.start_decided_with', null));
    }

    public function test_patch_wake_up_time_and_start_decided_with_together(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $planId = $this->getJson('/api/musume/plan?date=2026-07-18')
            ->assertOk()
            ->json('plan.id');

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => '07:30',
            'start_decided_with' => 'mama',
        ])
            ->assertOk()
            ->assertJsonPath('plan.wake_up_time', '07:30')
            ->assertJsonPath('plan.start_decided_with', 'mama');
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
            'decided_with' => 'mama',
        ])->assertOk();

        $this->putJson("/api/musume/plan/{$planId}/items", [
            'category' => 'tomorrow_plan',
            'titles' => ['ママとお出かけ'],
        ])->assertOk();

        $this->patchJson("/api/musume/plan/{$planId}", [
            'wake_up_time' => '07:30',
            'start_decided_with' => 'mama',
        ])->assertOk();

        $this->postJson("/api/musume/plan/{$planId}/reflection/complete", [
            'mode' => 'summer',
            'note' => null,
        ])->assertOk();

        $this->getJson('/api/koekake/musume-summary?date=2026-07-18')
            ->assertOk()
            ->assertJsonPath('summary.mode', 'summer')
            ->assertJsonPath('summary.today_tasks', ['夏休みの宿題'])
            ->assertJsonPath('summary.tomorrow_plans', ['ママとお出かけ'])
            ->assertJsonPath('summary.wake_up_time', '07:30')
            ->assertJsonPath('summary.decided_with.today', 'mama')
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('summary.decided_with.today')
                ->has('summary.decided_with.tomorrow_plan')
                ->where('summary.decided_with.tomorrow_plan', null)
                ->has('summary.decided_with.tomorrow_item')
                ->where('summary.decided_with.tomorrow_item', null)
                ->has('summary.decided_with.start')
                ->where('summary.decided_with.start', 'mama'))
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
