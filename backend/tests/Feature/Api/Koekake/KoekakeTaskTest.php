<?php

namespace Tests\Feature\Api\Koekake;

use App\Models\DailyTask;
use App\Models\PromptTemplate;
use App\Models\RoutineTemplate;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KoekakeTaskTest extends TestCase
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

    public function test_get_tasks_generates_daily_tasks_on_first_access(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $activeCount = RoutineTemplate::query()->where('is_active', true)->count();

        $response = $this->getJson('/api/koekake/tasks?date=2026-07-18');

        $response->assertOk()
            ->assertJsonPath('date', '2026-07-18')
            ->assertJsonCount($activeCount, 'tasks');

        $this->assertSame($activeCount, DailyTask::query()->where('task_date', '2026-07-18')->count());

        $second = $this->getJson('/api/koekake/tasks?date=2026-07-18');
        $second->assertOk()->assertJsonCount($activeCount, 'tasks');
        $this->assertSame($activeCount, DailyTask::query()->where('task_date', '2026-07-18')->count());
    }

    public function test_get_tasks_with_phase_still_generates_all_phases(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $activeCount = RoutineTemplate::query()->where('is_active', true)->count();
        $morningCount = RoutineTemplate::query()->where('is_active', true)->where('phase', 'morning')->count();

        $response = $this->getJson('/api/koekake/tasks?date=2026-07-18&phase=morning');

        $response->assertOk()->assertJsonCount($morningCount, 'tasks');
        $this->assertSame($activeCount, DailyTask::query()->where('task_date', '2026-07-18')->count());
    }

    public function test_inactive_routine_template_is_not_generated(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        RoutineTemplate::query()
            ->where('phase', 'morning')
            ->where('name', '起床')
            ->update(['is_active' => false]);

        $activeCount = RoutineTemplate::query()->where('is_active', true)->count();

        $this->getJson('/api/koekake/tasks?date=2026-07-18')
            ->assertOk()
            ->assertJsonCount($activeCount, 'tasks');

        $this->assertFalse(
            DailyTask::query()
                ->where('task_date', '2026-07-18')
                ->where('name', '起床')
                ->exists()
        );
    }

    public function test_suggested_prompt_level_follows_prompt_count(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:00:00', 'Asia/Tokyo'));

        $task = $this->findMorningTask('歯磨き');
        $template = PromptTemplate::query()
            ->where('routine_template_id', $task->routine_template_id)
            ->where('prompt_level', 1)
            ->firstOrFail();

        $first = $this->getJson('/api/koekake/tasks?date=2026-07-18&phase=morning');
        $first->assertOk()
            ->assertJsonPath('tasks.2.suggested_prompt.level', 1)
            ->assertJsonPath('tasks.2.suggested_prompt.text', $template->text);

        $this->postJson('/api/koekake/prompt-events', [
            'daily_task_id' => $task->id,
            'prompt_text' => $template->text,
            'source' => 'template',
            'idempotency_key' => 'prompt-level-001',
        ])->assertCreated();

        $level2 = PromptTemplate::query()
            ->where('routine_template_id', $task->routine_template_id)
            ->where('prompt_level', 2)
            ->firstOrFail();

        $second = $this->getJson('/api/koekake/tasks?date=2026-07-18&phase=morning');
        $second->assertOk()
            ->assertJsonPath('tasks.2.prompt_count', 1)
            ->assertJsonPath('tasks.2.suggested_prompt.level', 2)
            ->assertJsonPath('tasks.2.suggested_prompt.text', $level2->text);

        $this->postJson('/api/koekake/prompt-events', [
            'daily_task_id' => $task->id,
            'prompt_text' => $level2->text,
            'source' => 'template',
            'idempotency_key' => 'prompt-level-002',
        ])->assertCreated();

        $level3 = PromptTemplate::query()
            ->where('routine_template_id', $task->routine_template_id)
            ->where('prompt_level', 3)
            ->firstOrFail();

        $third = $this->getJson('/api/koekake/tasks?date=2026-07-18&phase=morning');
        $third->assertOk()
            ->assertJsonPath('tasks.2.prompt_count', 2)
            ->assertJsonPath('tasks.2.suggested_prompt.level', 3)
            ->assertJsonPath('tasks.2.suggested_prompt.text', $level3->text);
    }

    private function findMorningTask(string $name): DailyTask
    {
        $this->getJson('/api/koekake/tasks?date=2026-07-18');

        return DailyTask::query()
            ->where('task_date', '2026-07-18')
            ->where('phase', 'morning')
            ->where('name', $name)
            ->firstOrFail();
    }
}
