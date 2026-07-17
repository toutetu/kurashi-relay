<?php

namespace Tests\Feature\Api\Koekake;

use App\Models\DailyTask;
use App\Models\ReminderSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SnoozeTest extends TestCase
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

    public function test_snooze_with_minutes_creates_reminder(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        $response = $this->postJson("/api/koekake/tasks/{$task->id}/snooze", [
            'minutes' => 5,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('task_id', $task->id)
            ->assertJsonPath('next_remind_at', '2026-07-18T20:05:00+09:00');

        $this->assertSame(1, ReminderSchedule::query()
            ->where('daily_task_id', $task->id)
            ->where('status', 'scheduled')
            ->count());
    }

    public function test_snooze_with_remind_at_creates_reminder(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        $response = $this->postJson("/api/koekake/tasks/{$task->id}/snooze", [
            'remind_at' => '2026-07-18T20:30:00+09:00',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('next_remind_at', '2026-07-18T20:30:00+09:00');
    }

    public function test_snooze_with_none_today_cancels_without_creating(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        ReminderSchedule::query()->create([
            'daily_task_id' => $task->id,
            'remind_at' => Carbon::parse('2026-07-18 20:30:00', 'Asia/Tokyo')->utc(),
            'status' => 'scheduled',
        ]);

        $response = $this->postJson("/api/koekake/tasks/{$task->id}/snooze", [
            'none_today' => true,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('next_remind_at', null);

        $this->assertSame(0, ReminderSchedule::query()
            ->where('daily_task_id', $task->id)
            ->where('status', 'scheduled')
            ->count());
    }

    public function test_snooze_rejects_multiple_options(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        $this->postJson("/api/koekake/tasks/{$task->id}/snooze", [
            'minutes' => 5,
            'remind_at' => '2026-07-18T20:30:00+09:00',
        ])->assertStatus(422);
    }

    public function test_snooze_replaces_existing_scheduled_reminder(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        $this->postJson("/api/koekake/tasks/{$task->id}/snooze", ['minutes' => 5])->assertOk();
        $this->postJson("/api/koekake/tasks/{$task->id}/snooze", ['minutes' => 10])
            ->assertOk()
            ->assertJsonPath('next_remind_at', '2026-07-18T20:10:00+09:00');

        $this->assertSame(1, ReminderSchedule::query()
            ->where('daily_task_id', $task->id)
            ->where('status', 'scheduled')
            ->count());

        $this->assertSame(1, ReminderSchedule::query()
            ->where('daily_task_id', $task->id)
            ->where('status', 'cancelled')
            ->count());
    }

    private function prepareTask(): DailyTask
    {
        $this->getJson('/api/koekake/tasks?date=2026-07-18');

        return DailyTask::query()
            ->where('task_date', '2026-07-18')
            ->where('phase', 'night')
            ->where('name', '就寝')
            ->firstOrFail();
    }
}
