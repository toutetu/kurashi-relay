<?php

namespace Tests\Feature\Api\Koekake;

use App\Models\CompletionEvent;
use App\Models\DailyTask;
use App\Models\ReminderSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompletionTest extends TestCase
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

    public function test_patch_completion_upserts_single_row(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        $first = $this->patchJson("/api/koekake/tasks/{$task->id}/completion", [
            'status' => 'completed',
        ]);

        $first->assertOk()
            ->assertJsonPath('task_id', $task->id)
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('completion.status', 'completed');

        $second = $this->patchJson("/api/koekake/tasks/{$task->id}/completion", [
            'status' => 'partial',
            'note' => '少しだけ',
        ]);

        $second->assertOk()
            ->assertJsonPath('status', 'partial')
            ->assertJsonPath('completion.note', '少しだけ');

        $this->assertSame(1, CompletionEvent::query()->where('daily_task_id', $task->id)->count());
    }

    public function test_patch_completion_with_invalid_status_returns_422(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        $this->patchJson("/api/koekake/tasks/{$task->id}/completion", [
            'status' => 'invalid',
        ])->assertStatus(422);
    }

    public function test_completed_status_cancels_scheduled_reminders(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        ReminderSchedule::query()->create([
            'daily_task_id' => $task->id,
            'remind_at' => Carbon::parse('2026-07-18 20:30:00', 'Asia/Tokyo')->utc(),
            'status' => 'scheduled',
        ]);

        $this->patchJson("/api/koekake/tasks/{$task->id}/completion", [
            'status' => 'completed',
        ])->assertOk();

        $this->assertSame(
            0,
            ReminderSchedule::query()
                ->where('daily_task_id', $task->id)
                ->where('status', 'scheduled')
                ->count()
        );
    }

    public function test_partial_status_keeps_scheduled_reminders(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $task = $this->prepareTask();

        ReminderSchedule::query()->create([
            'daily_task_id' => $task->id,
            'remind_at' => Carbon::parse('2026-07-18 20:30:00', 'Asia/Tokyo')->utc(),
            'status' => 'scheduled',
        ]);

        $this->patchJson("/api/koekake/tasks/{$task->id}/completion", [
            'status' => 'partial',
        ])->assertOk();

        $this->assertSame(
            1,
            ReminderSchedule::query()
                ->where('daily_task_id', $task->id)
                ->where('status', 'scheduled')
                ->count()
        );
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
