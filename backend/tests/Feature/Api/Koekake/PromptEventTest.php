<?php

namespace Tests\Feature\Api\Koekake;

use App\Models\DailyTask;
use App\Models\PromptEvent;
use App\Models\PromptTemplate;
use App\Services\Koekake\PromptEventService;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PromptEventTest extends TestCase
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

    public function test_post_prompt_event_creates_event_and_recalculates_cache(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:12:00', 'Asia/Tokyo'));

        $task = $this->prepareTask('歯磨き');
        $template = PromptTemplate::query()
            ->where('routine_template_id', $task->routine_template_id)
            ->where('prompt_level', 1)
            ->firstOrFail();

        $response = $this->postJson('/api/koekake/prompt-events', [
            'daily_task_id' => $task->id,
            'prompt_text' => $template->text,
            'source' => 'template',
            'idempotency_key' => 'create-prompt-001',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('daily_task_id', $task->id)
            ->assertJsonPath('prompt_count', 1)
            ->assertJsonPath('latest_prompt_at', '2026-07-18T08:12:00+09:00')
            ->assertJsonPath('suggested_prompt.level', 2);

        $task->refresh();
        $this->assertSame(1, $task->prompt_count);
        $this->assertNotNull($task->latest_prompt_at);
    }

    public function test_same_idempotency_key_replay_returns_existing_event(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:12:00', 'Asia/Tokyo'));

        $task = $this->prepareTask('歯磨き');
        $payload = [
            'daily_task_id' => $task->id,
            'prompt_text' => '歯磨き、今する？ 5分後にする？',
            'source' => 'template',
            'idempotency_key' => 'replay-prompt-001',
        ];

        $first = $this->postJson('/api/koekake/prompt-events', $payload)->assertCreated();
        $eventId = $first->json('prompt_event_id');

        $replay = $this->postJson('/api/koekake/prompt-events', $payload);

        $replay
            ->assertOk()
            ->assertJsonPath('prompt_event_id', $eventId)
            ->assertJsonPath('prompt_count', 1);

        $this->assertSame(1, PromptEvent::query()->where('idempotency_key', 'replay-prompt-001')->count());
    }

    public function test_delete_prompt_event_cancels_and_recalculates(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:12:00', 'Asia/Tokyo'));

        $task = $this->prepareTask('歯磨き');

        $create = $this->postJson('/api/koekake/prompt-events', [
            'daily_task_id' => $task->id,
            'prompt_text' => '歯磨き、今する？ 5分後にする？',
            'source' => 'template',
            'idempotency_key' => 'cancel-prompt-001',
        ])->assertCreated();

        $eventId = $create->json('prompt_event_id');

        $this->deleteJson("/api/koekake/prompt-events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('daily_task_id', $task->id)
            ->assertJsonPath('prompt_count', 0)
            ->assertJsonPath('latest_prompt_at', null);

        $event = PromptEvent::query()->findOrFail($eventId);
        $this->assertNotNull($event->cancelled_at);
    }

    public function test_delete_prompt_event_on_past_date_returns_422(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-17 08:12:00', 'Asia/Tokyo'));

        $task = $this->prepareTask('歯磨き', '2026-07-16');

        $create = $this->postJson('/api/koekake/prompt-events', [
            'daily_task_id' => $task->id,
            'prompt_text' => '歯磨き、今する？ 5分後にする？',
            'source' => 'template',
            'idempotency_key' => 'past-cancel-001',
        ])->assertCreated();

        Carbon::setTestNow(Carbon::parse('2026-07-18 08:12:00', 'Asia/Tokyo'));

        $this->deleteJson('/api/koekake/prompt-events/'.$create->json('prompt_event_id'))
            ->assertStatus(422);
    }

    public function test_store_recovers_from_unique_violation_on_idempotency_key(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:12:00', 'Asia/Tokyo'));

        $task = $this->prepareTask('歯磨き');
        $promptText = '歯磨き、今する？ 5分後にする？';
        $source = 'template';
        $idempotencyKey = 'insert-conflict-recovery-001';

        // 並行再送の勝者行を store() の外側トランザクション外で COMMIT 済み insert する。
        // SQLite 単一接続では store() 冒頭の existing チェックが勝者を見つけるため early return になるが、
        // PostgreSQL 並行時は existing をすり抜けて INSERT が unique 違反 → catch 経路になる。
        // catch 内 SELECT が外側 txn で動くことは、下記 savepoint 検証で担保する。
        $winner = PromptEvent::query()->create([
            'daily_task_id' => $task->id,
            'prompted_at' => now('UTC'),
            'prompt_order' => 1,
            'prompt_text' => $promptText,
            'source' => $source,
            'idempotency_key' => $idempotencyKey,
        ]);

        $countBefore = PromptEvent::query()->count();

        $service = $this->app->make(PromptEventService::class);
        $result = $service->store($task->id, $promptText, $source, $idempotencyKey);

        $this->assertSame(200, $result['status_code']);
        $this->assertSame($winner->id, $result['prompt_event_id']);
        $this->assertSame($countBefore, PromptEvent::query()->count());

        // nested savepoint 上の duplicate INSERT 後も外側 txn で勝者行を SELECT できること
        // (PostgreSQL abort 状態を避ける PromptEventService::store の修正根拠)
        $savepointKey = 'savepoint-recovery-001';

        DB::transaction(function () use ($task, $savepointKey, $promptText, $source): void {
            $winnerInTxn = PromptEvent::query()->create([
                'daily_task_id' => $task->id,
                'prompted_at' => now('UTC'),
                'prompt_order' => 1,
                'prompt_text' => $promptText,
                'source' => $source,
                'idempotency_key' => $savepointKey,
            ]);

            try {
                DB::transaction(function () use ($task, $savepointKey, $promptText, $source): void {
                    PromptEvent::query()->create([
                        'daily_task_id' => $task->id,
                        'prompted_at' => now('UTC'),
                        'prompt_order' => 2,
                        'prompt_text' => $promptText,
                        'source' => $source,
                        'idempotency_key' => $savepointKey,
                    ]);
                }, 1);
                $this->fail('Expected unique constraint violation.');
            } catch (QueryException $exception) {
                $this->assertTrue(
                    str_contains($exception->getMessage(), 'UNIQUE constraint failed')
                    || (($exception->errorInfo[0] ?? '') === '23505'),
                );
            }

            $recovered = PromptEvent::query()
                ->where('idempotency_key', $savepointKey)
                ->first();

            $this->assertNotNull($recovered);
            $this->assertSame($winnerInTxn->id, $recovered->id);
        });
    }

    public function test_double_cancel_is_idempotent(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 08:12:00', 'Asia/Tokyo'));

        $task = $this->prepareTask('歯磨き');

        $create = $this->postJson('/api/koekake/prompt-events', [
            'daily_task_id' => $task->id,
            'prompt_text' => '歯磨き、今する？ 5分後にする？',
            'source' => 'template',
            'idempotency_key' => 'double-cancel-001',
        ])->assertCreated();

        $eventId = $create->json('prompt_event_id');

        $this->deleteJson("/api/koekake/prompt-events/{$eventId}")->assertOk();
        $this->deleteJson("/api/koekake/prompt-events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('prompt_count', 0);
    }

    private function prepareTask(string $name, string $date = '2026-07-18'): DailyTask
    {
        $this->getJson("/api/koekake/tasks?date={$date}");

        return DailyTask::query()
            ->where('task_date', $date)
            ->where('phase', 'morning')
            ->where('name', $name)
            ->firstOrFail();
    }
}
