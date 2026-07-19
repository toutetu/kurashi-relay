<?php

namespace Tests\Feature\Database;

use App\Models\ActivityDefinition;
use App\Models\ActivityEvent;
use App\Models\ActivityEventParticipant;
use App\Models\DailyPlan;
use App\Models\DailyTask;
use App\Models\FamilyMember;
use App\Models\PlanAnswerVersion;
use App\Models\PlannedActivity;
use App\Models\PlanQuestion;
use App\Models\PromptEvent;
use App\Models\ReflectionSession;
use App\Models\RewardRule;
use App\Models\RewardTransaction;
use App\Models\RoutineTemplate;
use App\Models\TaskDefinition;
use Carbon\Carbon;
use Database\Support\ActivityDefinitionCatalog;
use Database\Support\ActivityEventCancellationGuard;
use Database\Support\RoutineTemplateSlugCatalog;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PhaseCdeTargetSchemaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_migrate_fresh_seed_creates_target_schema_tables(): void
    {
        $expectedTables = [
            'activity_definitions',
            'activity_events',
            'activity_event_participants',
            'activity_event_outcomes',
            'activity_event_cancellations',
            'planned_activities',
            'plan_actual_links',
            'reward_rules',
            'reward_transactions',
            'plan_questions',
            'plan_answer_versions',
        ];

        foreach ($expectedTables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table: {$table}");
        }
    }

    public function test_master_seed_counts_are_stable(): void
    {
        $this->assertSame(count(ActivityDefinitionCatalog::definitions()), ActivityDefinition::query()->count());
        $this->assertSame(22, RoutineTemplate::query()->count());
        $this->assertSame(10, TaskDefinition::query()->count());
        $this->assertSame(8, PlanQuestion::query()->count());
        $this->assertSame(5, RewardRule::query()->count());
        $this->assertSame(2, FamilyMember::query()->count());

        Artisan::call('db:seed');

        $this->assertSame(count(ActivityDefinitionCatalog::definitions()), ActivityDefinition::query()->count());
        $this->assertSame(22, RoutineTemplate::query()->count());
        $this->assertSame(10, TaskDefinition::query()->count());
        $this->assertSame(8, PlanQuestion::query()->count());
        $this->assertSame(5, RewardRule::query()->count());
    }

    public function test_all_active_masters_link_to_activity_definitions(): void
    {
        $this->assertSame(
            0,
            TaskDefinition::query()->where('is_active', true)->whereNull('activity_definition_id')->count(),
        );
        $this->assertSame(
            0,
            RoutineTemplate::query()->where('is_active', true)->whereNull('activity_definition_id')->count(),
        );
        $this->assertSame([], ActivityDefinitionCatalog::reviewRequiredTaskKeys());
    }

    public function test_routine_templates_have_slug_and_subject_member_after_seed(): void
    {
        $childId = FamilyMember::query()->where('role', 'child')->value('id');

        $templates = RoutineTemplate::query()->orderBy('id')->get();

        $this->assertCount(24, $templates);

        foreach ($templates as $template) {
            $this->assertNotNull($template->slug);
            $this->assertSame(
                RoutineTemplateSlugCatalog::slugFor($template->phase, $template->sort_order),
                $template->slug,
            );
            $this->assertSame($childId, $template->subject_member_id);
        }
    }

    public function test_api_writes_include_subject_member_id(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-21 08:00:00', 'Asia/Tokyo'));

        $childId = FamilyMember::query()->where('role', 'child')->value('id');

        $this->getJson('/api/musume/plan?date=2026-07-21')->assertOk();
        $this->getJson('/api/koekake/tasks?date=2026-07-21')->assertOk();

        $plan = DailyPlan::query()->where('plan_date', '2026-07-21')->firstOrFail();
        $task = DailyTask::query()->where('task_date', '2026-07-21')->firstOrFail();

        $this->assertSame($childId, $plan->subject_member_id);
        $this->assertSame($childId, $task->subject_member_id);
    }

    public function test_activity_events_require_valid_event_type(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('CHECK制約の拒否検証はPostgreSQLでのみ実施する。');

            return;
        }

        $definition = ActivityDefinition::query()->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');

        $this->expectException(QueryException::class);

        ActivityEvent::query()->create([
            'activity_definition_id' => $definition->id,
            'event_type' => 'invalid',
            'occurred_at' => now('UTC'),
            'recorded_by_member_id' => $childId,
            'source' => 'manual',
            'idempotency_key' => 'schema-test-invalid-event-type',
        ]);
    }

    public function test_activity_events_require_valid_source(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('CHECK制約の拒否検証はPostgreSQLでのみ実施する。');

            return;
        }

        $definition = ActivityDefinition::query()->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');

        $this->expectException(QueryException::class);

        ActivityEvent::query()->create([
            'activity_definition_id' => $definition->id,
            'event_type' => 'activity',
            'occurred_at' => now('UTC'),
            'recorded_by_member_id' => $childId,
            'source' => 'invalid-source',
            'idempotency_key' => 'schema-test-invalid-source',
        ]);
    }

    public function test_daily_plans_reject_null_subject_member_id(): void
    {
        $this->expectException(QueryException::class);

        DB::table('daily_plans')->insert([
            'plan_date' => '2099-12-31',
            'mode' => 'school',
            'subject_member_id' => null,
            'created_at' => now('UTC'),
            'updated_at' => now('UTC'),
        ]);
    }

    public function test_daily_tasks_reject_null_subject_member_id(): void
    {
        $template = RoutineTemplate::query()->firstOrFail();

        $this->expectException(QueryException::class);

        DB::table('daily_tasks')->insert([
            'task_date' => '2099-12-31',
            'routine_template_id' => $template->id,
            'phase' => $template->phase,
            'name' => $template->name,
            'icon' => $template->icon,
            'status' => 'scheduled',
            'prompt_count' => 0,
            'subject_member_id' => null,
            'created_at' => now('UTC'),
            'updated_at' => now('UTC'),
        ]);
    }

    public function test_routine_templates_reject_null_slug(): void
    {
        $template = RoutineTemplate::query()->firstOrFail();

        $this->expectException(QueryException::class);

        DB::table('routine_templates')
            ->where('id', $template->id)
            ->update(['slug' => null]);
    }

    public function test_routine_templates_reject_null_subject_member_id(): void
    {
        $template = RoutineTemplate::query()->firstOrFail();

        $this->expectException(QueryException::class);

        DB::table('routine_templates')
            ->where('id', $template->id)
            ->update(['subject_member_id' => null]);
    }

    public function test_activity_event_participants_reject_invalid_role(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('CHECK制約の拒否検証はPostgreSQLでのみ実施する。');

            return;
        }

        $event = $this->createSampleActivityEvent();

        $this->expectException(QueryException::class);

        ActivityEventParticipant::query()->create([
            'activity_event_id' => $event->id,
            'family_member_id' => FamilyMember::query()->where('role', 'child')->valueOrFail('id'),
            'role' => 'observer',
            'created_at' => now('UTC'),
        ]);
    }

    public function test_planned_activities_enforce_source_unique(): void
    {
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');

        PlannedActivity::query()->create([
            'subject_member_id' => $childId,
            'source_type' => 'manual',
            'source_key' => 'schema-test-duplicate',
            'title_snapshot' => 'テスト予定',
            'category_snapshot' => 'today_task',
            'local_date' => '2026-07-21',
            'status' => 'planned',
            'is_all_day' => false,
        ]);

        $this->expectException(QueryException::class);

        PlannedActivity::query()->create([
            'subject_member_id' => $childId,
            'source_type' => 'manual',
            'source_key' => 'schema-test-duplicate',
            'title_snapshot' => '重複予定',
            'category_snapshot' => 'today_task',
            'local_date' => '2026-07-21',
            'status' => 'planned',
            'is_all_day' => false,
        ]);
    }

    public function test_plan_answer_versions_enforce_version_unique(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-21 08:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/musume/plan?date=2026-07-21')->assertOk();

        $plan = DailyPlan::query()->where('plan_date', '2026-07-21')->firstOrFail();
        $question = PlanQuestion::query()->where('question_key', 'memo')->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');
        $now = now('UTC');

        PlanAnswerVersion::query()->create([
            'daily_plan_id' => $plan->id,
            'question_id' => $question->id,
            'version_no' => 1,
            'value_json' => ['text' => 'メモ1'],
            'recorded_by_member_id' => $childId,
            'recorded_at' => $now,
        ]);

        $this->expectException(QueryException::class);

        PlanAnswerVersion::query()->create([
            'daily_plan_id' => $plan->id,
            'question_id' => $question->id,
            'version_no' => 1,
            'value_json' => ['text' => 'メモ重複'],
            'recorded_by_member_id' => $childId,
            'recorded_at' => $now,
        ]);
    }

    public function test_reflection_sessions_allow_multiple_revisions(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-21 19:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/musume/plan?date=2026-07-21')->assertOk();
        $plan = DailyPlan::query()->where('plan_date', '2026-07-21')->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');
        $now = now('UTC');

        ReflectionSession::query()->create([
            'daily_plan_id' => $plan->id,
            'revision_no' => 1,
            'mode' => 'summer',
            'started_at' => $now,
            'completed_at' => $now,
            'recorded_by_member_id' => $childId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ReflectionSession::query()->create([
            'daily_plan_id' => $plan->id,
            'revision_no' => 2,
            'mode' => 'summer',
            'started_at' => $now,
            'completed_at' => $now,
            'recorded_by_member_id' => $childId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->assertSame(2, ReflectionSession::query()->where('daily_plan_id', $plan->id)->count());
    }

    public function test_prompt_events_keep_existing_prompt_order_column(): void
    {
        $this->assertTrue(Schema::hasColumn('prompt_events', 'prompt_order'));
        $this->assertTrue(Schema::hasColumn('prompt_events', 'activity_event_id'));
        $this->assertTrue(Schema::hasColumn('prompt_events', 'prompt_level'));
    }

    public function test_planned_activities_keep_calendar_event_version_without_fk(): void
    {
        $this->assertTrue(Schema::hasColumn('planned_activities', 'calendar_event_version_id'));

        $foreignKeyColumns = $this->foreignKeyColumnsForTable('planned_activities');

        $this->assertNotContains('calendar_event_version_id', $foreignKeyColumns);
    }

    public function test_prompt_events_enforce_one_to_one_activity_event_link(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-21 08:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/koekake/tasks?date=2026-07-21')->assertOk();

        $event = $this->createSampleActivityEvent();
        $task = DailyTask::query()->where('task_date', '2026-07-21')->firstOrFail();
        $now = now('UTC');

        PromptEvent::query()->create([
            'activity_event_id' => $event->id,
            'daily_task_id' => $task->id,
            'prompted_at' => $now,
            'prompt_order' => 1,
            'prompt_text' => '1回目',
            'source' => 'manual',
            'idempotency_key' => 'schema-test-prompt-link-1',
        ]);

        $this->expectException(QueryException::class);

        PromptEvent::query()->create([
            'activity_event_id' => $event->id,
            'daily_task_id' => $task->id,
            'prompted_at' => $now,
            'prompt_order' => 2,
            'prompt_text' => '2回目',
            'source' => 'manual',
            'idempotency_key' => 'schema-test-prompt-link-2',
        ]);
    }

    public function test_reward_transactions_enforce_event_rule_type_partial_unique(): void
    {
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');
        $rule = RewardRule::query()->firstOrFail();
        $event = $this->createSampleActivityEvent();
        $now = now('UTC');

        RewardTransaction::query()->create([
            'member_id' => $childId,
            'activity_event_id' => $event->id,
            'reward_rule_id' => $rule->id,
            'transaction_type' => 'earn',
            'kind' => 'gauge',
            'amount' => 1,
            'occurred_at' => $now,
            'idempotency_key' => 'schema-test-reward-partial-1',
        ]);

        $this->expectException(QueryException::class);

        RewardTransaction::query()->create([
            'member_id' => $childId,
            'activity_event_id' => $event->id,
            'reward_rule_id' => $rule->id,
            'transaction_type' => 'earn',
            'kind' => 'gauge',
            'amount' => 2,
            'occurred_at' => $now,
            'idempotency_key' => 'schema-test-reward-partial-2',
        ]);
    }

    public function test_activity_event_cancellations_reject_cancelled_at_before_occurred_at_on_postgresql(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('cancelled_at >= occurred_at のDBトリガー検証はPostgreSQLでのみ実施する。');

            return;
        }

        $event = $this->createSampleActivityEvent();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');
        $now = now('UTC');

        $this->expectException(QueryException::class);

        DB::table('activity_event_cancellations')->insert([
            'activity_event_id' => $event->id,
            'cancelled_at' => $event->occurred_at->copy()->subHour(),
            'cancelled_by_member_id' => $childId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function test_activity_event_cancellation_guard_rejects_invalid_timestamps_on_sqlite(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            $this->markTestSkipped('SQLiteではActivityEventCancellationGuardで代替検証する。');

            return;
        }

        $this->expectException(\InvalidArgumentException::class);

        ActivityEventCancellationGuard::assertCancelledAtNotBeforeOccurredAt(
            Carbon::parse('2026-07-21 11:00:00', 'UTC'),
            Carbon::parse('2026-07-21 12:00:00', 'UTC'),
        );
    }

    public function test_reflection_sessions_support_revision_history_in_create_schema(): void
    {
        $this->assertTrue(Schema::hasColumn('reflection_sessions', 'revision_no'));
        $this->assertTrue(Schema::hasColumn('reflection_sessions', 'recorded_by_member_id'));
    }

    public function test_consolidated_migrations_can_roll_back_and_reapply_safely(): void
    {
        $this->assertSame(0, ReflectionSession::query()->count());

        Artisan::call('migrate:rollback', ['--step' => 26]);

        $this->assertFalse(Schema::hasTable('family_members'));
        $this->assertFalse(Schema::hasTable('activity_definitions'));
        $this->assertFalse(Schema::hasTable('plan_answer_versions'));

        Artisan::call('migrate');
        $this->seed();

        $this->assertTrue(Schema::hasTable('family_members'));
        $this->assertTrue(Schema::hasTable('activity_definitions'));
        $this->assertTrue(Schema::hasTable('plan_answer_versions'));
        $this->assertSame(22, RoutineTemplate::query()->count());
    }

    public function test_postgresql_only_constraints_are_documented_when_not_sqlite(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('PostgreSQL 17でのCHECK/部分UNIQUE検証はSQLiteテストではスキップする。');

            return;
        }

        $checks = collect(DB::select(
            "SELECT conname FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace"
        ))->pluck('conname');

        $this->assertTrue($checks->contains('activity_events_event_type_check'));
        $this->assertTrue($checks->contains('activity_events_source_check'));
        $this->assertTrue($checks->contains('planned_activities_source_type_check'));
        $this->assertTrue($checks->contains('plan_answer_versions_version_no_check'));

        $indexes = collect(DB::select(
            "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
        ))->pluck('indexname');

        $this->assertTrue($indexes->contains('activity_events_prompt_time'));
        $this->assertTrue($indexes->contains('prompt_events_activity_event_id_unique'));
        $this->assertTrue($indexes->contains('plan_actual_links_event_type'));
        $this->assertTrue($indexes->contains('reward_transactions_event_rule_type_unique'));
        $this->assertTrue($indexes->contains('reminder_schedules_one_scheduled_per_task_unique'));
    }

    private function createSampleActivityEvent(): ActivityEvent
    {
        $definition = ActivityDefinition::query()->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');

        return ActivityEvent::query()->create([
            'activity_definition_id' => $definition->id,
            'event_type' => 'activity',
            'occurred_at' => now('UTC'),
            'recorded_by_member_id' => $childId,
            'source' => 'manual',
            'idempotency_key' => 'schema-test-'.uniqid('', true),
        ]);
    }

    /**
     * @return list<string>
     */
    private function foreignKeyColumnsForTable(string $table): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA foreign_key_list('{$table}')"))
                ->pluck('from')
                ->all();
        }

        if ($driver === 'pgsql') {
            return collect(DB::select(
                <<<'SQL'
SELECT kcu.column_name AS column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = ?
SQL,
                [$table],
            ))->pluck('column_name')->all();
        }

        return [];
    }
}
