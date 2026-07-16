<?php

namespace Tests\Feature\Api;

use App\Models\FamilyMember;
use App\Models\RewardAdjustment;
use App\Models\RewardCollection;
use App\Models\TaskRecord;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OshigotoPersistenceTest extends TestCase
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

    public function test_post_creates_record_and_updates_summary(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $childResponse = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'child-create-001',
        ]);

        $childResponse
            ->assertCreated()
            ->assertJsonPath('meta.deduplicated', false)
            ->assertJsonPath('data.summary.lifetime_count', 1)
            ->assertJsonPath('data.summary.gauge_count', 1)
            ->assertJsonPath('data.summary.coins', 0)
            ->assertJsonPath('data.summary.points', null)
            ->assertJsonMissingPath('data.revealed_reward');

        $motherResponse = $this->postJson('/api/task-records', [
            'member' => 'mother',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'mother-create-001',
        ]);

        $motherResponse
            ->assertCreated()
            ->assertJsonPath('data.summary.points', 10)
            ->assertJsonPath('data.summary.coins', null)
            ->assertJsonPath('data.summary.gauge_count', 1);
    }

    public function test_same_idempotency_key_replay_returns_existing_record(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $payload = [
            'member' => 'child',
            'task' => 'kigae',
            'date' => '2026-07-16',
            'idempotency_key' => 'replay-key-001',
        ];

        $first = $this->postJson('/api/task-records', $payload)->assertCreated();
        $recordId = $first->json('data.record.id');

        $replay = $this->postJson('/api/task-records', $payload);

        $replay
            ->assertOk()
            ->assertJsonPath('meta.deduplicated', true)
            ->assertJsonPath('data.record.id', $recordId);

        $this->assertSame(1, TaskRecord::query()->where('idempotency_key', 'replay-key-001')->count());
    }

    public function test_tenth_post_replay_returns_same_revealed_reward(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->createNineChildRecords();

        $payload = [
            'member' => 'child',
            'task' => 'kigae',
            'date' => '2026-07-15',
            'idempotency_key' => 'milestone-key-001',
        ];

        $first = $this->postJson('/api/task-records', $payload)->assertCreated();
        $reward = $first->json('data.revealed_reward');

        $this->assertNotNull($reward);

        $this->postJson('/api/task-records', $payload)
            ->assertOk()
            ->assertJsonPath('meta.deduplicated', true)
            ->assertJsonPath('data.revealed_reward.item_slug', $reward['item_slug'])
            ->assertJsonPath('data.revealed_reward.milestone_number', $reward['milestone_number']);
    }

    public function test_duplicate_member_task_date_with_different_key_is_deduplicated(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $first = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'dup-key-a',
        ])->assertCreated();

        $second = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'dup-key-b',
        ]);

        $second
            ->assertOk()
            ->assertJsonPath('meta.deduplicated', true)
            ->assertJsonPath('data.record.id', $first->json('data.record.id'))
            ->assertJsonMissingPath('data.revealed_reward');

        $this->assertSame(1, TaskRecord::query()->count());
    }

    public function test_idempotency_key_payload_mismatch_returns_conflict(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'conflict-key',
        ])->assertCreated();

        $conflict = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'kigae',
            'date' => '2026-07-16',
            'idempotency_key' => 'conflict-key',
        ]);

        $conflict
            ->assertStatus(409)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('errors', []);

        $this->assertStringContainsString('"errors":{}', $conflict->getContent());
        $this->assertSame(1, TaskRecord::query()->count());
    }

    public function test_same_idempotency_key_for_different_member_returns_conflict(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'cross-member-conflict',
        ])->assertCreated();

        $this->postJson('/api/task-records', [
            'member' => 'mother',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'cross-member-conflict',
        ])
            ->assertStatus(409)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('errors', []);

        $this->assertSame(1, TaskRecord::query()->count());
    }

    public function test_delete_cancels_record_and_is_idempotent(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $created = $this->postJson('/api/task-records', [
            'member' => 'mother',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'cancel-target',
        ])->assertCreated();

        $recordId = $created->json('data.record.id');

        $this->deleteJson("/api/task-records/{$recordId}")
            ->assertOk()
            ->assertJsonPath('data.summary.points', 0)
            ->assertJsonPath('data.record.cancelled_at', fn (?string $value): bool => $value !== null);

        $this->deleteJson("/api/task-records/{$recordId}")
            ->assertOk()
            ->assertJsonPath('data.summary.points', 0);
    }

    public function test_cancelled_record_can_be_recreated_on_same_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $created = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'cancel-recreate-a',
        ])->assertCreated();

        $recordId = $created->json('data.record.id');

        $this->deleteJson("/api/task-records/{$recordId}")->assertOk();

        $recreated = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'cancel-recreate-b',
        ])->assertCreated();

        $this->assertNotSame($recordId, $recreated->json('data.record.id'));
        $this->assertSame(2, TaskRecord::query()->count());
        $this->assertSame(1, TaskRecord::query()->whereNull('cancelled_at')->count());
    }

    public function test_tenth_completion_grants_reward_once_even_after_cancel_and_recomplete(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $recordIds = $this->createTenChildRecords();

        $this->assertSame(1, RewardCollection::query()->count());
        $this->assertDatabaseHas('reward_collections', [
            'milestone_number' => 1,
            'type' => 'zombie',
        ]);

        $lastRecordId = end($recordIds);
        $this->deleteJson("/api/task-records/{$lastRecordId}")->assertOk();

        $recompleted = $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'suito',
            'date' => '2026-07-15',
            'idempotency_key' => 'recomplete-milestone',
        ]);

        $recompleted
            ->assertCreated()
            ->assertJsonMissingPath('data.revealed_reward');

        $this->assertSame(1, RewardCollection::query()->count());
        $this->assertSame(10, TaskRecord::query()->whereNull('cancelled_at')->count());
    }

    public function test_get_tasks_reflects_done_state_and_validates_input(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-16',
            'idempotency_key' => 'tasks-index-done',
        ])->assertCreated();

        $this->getJson('/api/tasks?member=child&date=2026-07-16')
            ->assertOk()
            ->assertJsonPath('data.tasks.2.done', true)
            ->assertJsonPath('data.tasks.2.slug', 'shokki');

        $this->getJson('/api/tasks?member=invalid')
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error');

        $this->getJson('/api/tasks?member=child&date=2026-07-17')
            ->assertUnprocessable()
            ->assertJsonPath('errors.date.0', '未来の日付は指定できません。');
    }

    public function test_post_without_date_uses_jst_today_at_utc_boundary(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-15 15:30:00', 'UTC'));

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'idempotency_key' => 'jst-boundary-key',
        ])
            ->assertCreated()
            ->assertJsonPath('data.record.record_date', '2026-07-16');
    }

    public function test_invalid_task_slug_and_missing_record_return_expected_errors(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'unknown-task',
            'date' => '2026-07-16',
            'idempotency_key' => 'invalid-task-key',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error');

        $notFound = $this->deleteJson('/api/task-records/99999');

        $notFound
            ->assertNotFound()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('errors', []);

        $this->assertStringContainsString('"errors":{}', $notFound->getContent());

        $this->getJson('/api/not-found')
            ->assertNotFound()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('errors', []);
    }

    public function test_post_accepts_thirty_days_ago_and_rejects_thirty_one_days_ago(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-06-16',
            'idempotency_key' => 'thirty-days-ago',
        ])->assertCreated();

        $this->postJson('/api/task-records', [
            'member' => 'child',
            'task' => 'kigae',
            'date' => '2026-06-15',
            'idempotency_key' => 'thirty-one-days-ago',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.date.0', '指定できる過去日付の範囲を超えています。');
    }

    public function test_negative_gauge_adjustment_uses_floor_division_and_mathematical_modulo(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $child = FamilyMember::query()->where('role', 'child')->firstOrFail();

        RewardAdjustment::query()->create([
            'family_member_id' => $child->id,
            'kind' => 'gauge',
            'amount' => -1,
            'reason' => '負数境界のテスト',
        ]);
        RewardAdjustment::query()->create([
            'family_member_id' => $child->id,
            'kind' => 'coin',
            'amount' => 25,
            'reason' => 'コイン補正のテスト',
        ]);

        $this->getJson('/api/rewards/summary?member=child')
            ->assertOk()
            ->assertJsonPath('data.lifetime_count', -1)
            ->assertJsonPath('data.full_count', -1)
            ->assertJsonPath('data.gauge_count', 9)
            ->assertJsonPath('data.coins', -75);
    }

    public function test_custom_migrations_use_timezone_aware_timestamps(): void
    {
        $migrationFiles = glob(database_path('migrations/*.php'));

        $this->assertIsArray($migrationFiles);
        $this->assertCount(5, $migrationFiles);

        foreach ($migrationFiles as $migrationFile) {
            $contents = file_get_contents($migrationFile);

            $this->assertIsString($contents);
            $this->assertStringContainsString('$table->timestampsTz();', $contents);
            $this->assertStringNotContainsString('$table->timestamps();', $contents);
        }
    }

    public function test_rewards_endpoints_return_summary_and_collections(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-16 10:00:00', 'Asia/Tokyo'));

        $this->createTenChildRecords();

        $this->getJson('/api/rewards/summary?member=child')
            ->assertOk()
            ->assertJsonPath('data.lifetime_count', 10)
            ->assertJsonPath('data.coins', 100)
            ->assertJsonPath('data.points', null);

        $this->getJson('/api/rewards/collections?member=child')
            ->assertOk()
            ->assertJsonCount(1, 'data.collections')
            ->assertJsonPath('data.collections.0.milestone_number', 1);
    }

    /**
     * @return list<int>
     */
    private function createNineChildRecords(): array
    {
        $tasks = ['kigae', 'fuku', 'shokki', 'kaban', 'suito'];
        $recordIds = [];

        foreach (['2026-07-16'] as $date) {
            foreach ($tasks as $index => $task) {
                $response = $this->postJson('/api/task-records', [
                    'member' => 'child',
                    'task' => $task,
                    'date' => $date,
                    'idempotency_key' => "nine-records-{$date}-{$index}",
                ])->assertCreated();

                $recordIds[] = $response->json('data.record.id');
            }
        }

        foreach (['fuku', 'shokki', 'kaban', 'suito'] as $index => $task) {
            $response = $this->postJson('/api/task-records', [
                'member' => 'child',
                'task' => $task,
                'date' => '2026-07-15',
                'idempotency_key' => "nine-records-2026-07-15-{$index}",
            ])->assertCreated();

            $recordIds[] = $response->json('data.record.id');
        }

        return $recordIds;
    }

    /**
     * @return list<int>
     */
    private function createTenChildRecords(): array
    {
        $tasks = ['kigae', 'fuku', 'shokki', 'kaban', 'suito'];
        $recordIds = [];

        foreach (['2026-07-16', '2026-07-15'] as $date) {
            foreach ($tasks as $index => $task) {
                $response = $this->postJson('/api/task-records', [
                    'member' => 'child',
                    'task' => $task,
                    'date' => $date,
                    'idempotency_key' => "ten-records-{$date}-{$index}",
                ])->assertCreated();

                $recordIds[] = $response->json('data.record.id');
            }
        }

        return $recordIds;
    }
}
