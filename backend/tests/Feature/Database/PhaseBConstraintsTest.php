<?php

namespace Tests\Feature\Database;

use App\Models\DailyPlan;
use App\Models\DailyTask;
use App\Models\FamilyMember;
use App\Models\PromptTemplate;
use App\Models\ReminderSchedule;
use App\Models\RewardCollection;
use App\Models\RoutineTemplate;
use App\Models\TaskDefinition;
use App\Models\TaskRecord;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PhaseBConstraintsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Mirrors the frozen slug map embedded in the Phase B slug migration.
     *
     * @var array<string, array<int, string>>
     */
    private const EXPECTED_SLUGS_BY_PHASE_AND_SORT_ORDER = [
        'morning' => [
            1 => 'morning-wake-up',
            2 => 'morning-breakfast',
            3 => 'morning-teeth-brushing',
            4 => 'morning-medication',
            5 => 'morning-changing-clothes',
            6 => 'morning-sunscreen',
            7 => 'morning-belongings-check',
            8 => 'morning-departure',
        ],
        'evening' => [
            1 => 'evening-home-return',
            2 => 'evening-today-schedule',
            3 => 'evening-homework',
            4 => 'evening-dinner',
            5 => 'evening-bath',
            6 => 'evening-dish-clearing',
            7 => 'evening-tomorrow-belongings',
        ],
        'night' => [
            1 => 'night-reflection',
            2 => 'night-tomorrow-schedule',
            3 => 'night-tomorrow-preparation',
            4 => 'night-bath',
            5 => 'night-teeth-brushing',
            6 => 'night-medication',
            7 => 'night-screen-cutoff',
            8 => 'night-bedtime',
            9 => 'night-goodnight',
        ],
    ];

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

    public function test_routine_templates_have_stable_slug_after_seed(): void
    {
        $templates = RoutineTemplate::query()->orderBy('id')->get();

        $this->assertCount(24, $templates);
        $this->assertTrue(Schema::hasColumn('routine_templates', 'slug'));

        foreach ($templates as $template) {
            $this->assertNotNull($template->slug);
            $this->assertSame(
                self::EXPECTED_SLUGS_BY_PHASE_AND_SORT_ORDER[$template->phase][$template->sort_order],
                $template->slug,
            );
        }
    }

    public function test_prompt_templates_reject_duplicate_sort_positions(): void
    {
        $template = RoutineTemplate::query()->firstOrFail();

        $this->expectException(QueryException::class);

        PromptTemplate::query()->create([
            'routine_template_id' => $template->id,
            'prompt_level' => 1,
            'sort_order' => 0,
            'text' => '重複テスト',
            'is_preferred' => false,
        ]);
    }

    public function test_reminder_schedules_allow_historical_rows_but_reject_duplicate_scheduled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-18 20:00:00', 'Asia/Tokyo'));

        $this->getJson('/api/koekake/tasks?date=2026-07-18')->assertOk();

        $task = DailyTask::query()
            ->where('task_date', '2026-07-18')
            ->firstOrFail();

        ReminderSchedule::query()->create([
            'daily_task_id' => $task->id,
            'remind_at' => Carbon::parse('2026-07-18 20:10:00', 'Asia/Tokyo')->utc(),
            'status' => 'cancelled',
        ]);

        ReminderSchedule::query()->create([
            'daily_task_id' => $task->id,
            'remind_at' => Carbon::parse('2026-07-18 20:20:00', 'Asia/Tokyo')->utc(),
            'status' => 'scheduled',
        ]);

        $this->expectException(QueryException::class);

        ReminderSchedule::query()->create([
            'daily_task_id' => $task->id,
            'remind_at' => Carbon::parse('2026-07-18 20:30:00', 'Asia/Tokyo')->utc(),
            'status' => 'scheduled',
        ]);
    }

    public function test_reward_collections_allow_null_task_record_but_reject_duplicate_non_null(): void
    {
        $child = FamilyMember::query()->where('role', 'child')->firstOrFail();

        RewardCollection::query()->create([
            'family_member_id' => $child->id,
            'type' => 'zombie',
            'item_slug' => 'vampire',
            'milestone_number' => 901,
            'obtained_on' => '2026-07-18',
            'task_record_id' => null,
        ]);

        RewardCollection::query()->create([
            'family_member_id' => $child->id,
            'type' => 'zombie',
            'item_slug' => 'demon',
            'milestone_number' => 902,
            'obtained_on' => '2026-07-18',
            'task_record_id' => null,
        ]);

        $record = TaskRecord::query()->create([
            'family_member_id' => $child->id,
            'task_definition_id' => TaskDefinition::query()->where('owner_role', 'child')->firstOrFail()->id,
            'record_date' => '2026-07-18',
            'completed_at' => now('UTC'),
            'idempotency_key' => 'phase-b-reward-duplicate',
        ]);

        RewardCollection::query()->create([
            'family_member_id' => $child->id,
            'type' => 'zombie',
            'item_slug' => 'pierrot',
            'milestone_number' => 903,
            'obtained_on' => '2026-07-18',
            'task_record_id' => $record->id,
        ]);

        $this->expectException(QueryException::class);

        RewardCollection::query()->create([
            'family_member_id' => $child->id,
            'type' => 'zombie',
            'item_slug' => 'exec',
            'milestone_number' => 904,
            'obtained_on' => '2026-07-18',
            'task_record_id' => $record->id,
        ]);
    }

    public function test_api_creates_daily_plans_and_tasks_with_child_subject_member_id(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-19 08:00:00', 'Asia/Tokyo'));

        $childId = FamilyMember::query()->where('role', 'child')->firstOrFail()->id;

        $this->getJson('/api/musume/plan?date=2026-07-19')->assertOk();
        $this->getJson('/api/koekake/tasks?date=2026-07-19')->assertOk();

        $plan = DailyPlan::query()->where('plan_date', '2026-07-19')->firstOrFail();
        $task = DailyTask::query()->where('task_date', '2026-07-19')->firstOrFail();

        $this->assertSame($childId, $plan->subject_member_id);
        $this->assertSame($childId, $task->subject_member_id);
    }

    public function test_consolidated_create_migrations_include_phase_b_columns(): void
    {
        $this->assertTrue(Schema::hasColumn('daily_plans', 'subject_member_id'));
        $this->assertTrue(Schema::hasColumn('daily_tasks', 'subject_member_id'));
        $this->assertTrue(Schema::hasColumn('routine_templates', 'slug'));
        $this->assertTrue(Schema::hasColumn('routine_templates', 'subject_member_id'));
    }
}
