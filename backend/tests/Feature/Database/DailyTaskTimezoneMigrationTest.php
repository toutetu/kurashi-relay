<?php

namespace Tests\Feature\Database;

use App\Models\FamilyMember;
use App\Models\RoutineTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DailyTaskTimezoneMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_migration_corrects_existing_schedules_that_were_saved_as_utc_clock_time(): void
    {
        Artisan::call('migrate:rollback', [
            '--path' => 'database/migrations/2026_07_19_010001_correct_daily_task_scheduled_at_timezone.php',
        ]);

        $wakeUp = RoutineTemplate::query()->where('name', '起床')->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');

        DB::table('daily_tasks')->insert([
            'task_date' => '2026-07-18',
            'routine_template_id' => $wakeUp->id,
            'subject_member_id' => $childId,
            'phase' => $wakeUp->phase,
            'name' => $wakeUp->name,
            'icon' => $wakeUp->icon,
            'scheduled_at' => '2026-07-18 07:00:00',
            'status' => 'scheduled',
            'prompt_count' => 0,
            'created_at' => '2026-07-17 23:00:00',
            'updated_at' => '2026-07-17 23:00:00',
        ]);

        Artisan::call('migrate', [
            '--path' => 'database/migrations/2026_07_19_010001_correct_daily_task_scheduled_at_timezone.php',
        ]);

        $this->assertSame(
            '2026-07-17 22:00:00',
            DB::table('daily_tasks')->where('name', '起床')->value('scheduled_at'),
        );
    }

    public function test_migration_rollback_restores_the_previous_storage_interpretation(): void
    {
        $wakeUp = RoutineTemplate::query()->where('name', '起床')->firstOrFail();
        $childId = FamilyMember::query()->where('role', 'child')->valueOrFail('id');

        DB::table('daily_tasks')->insert([
            'task_date' => '2026-07-18',
            'routine_template_id' => $wakeUp->id,
            'subject_member_id' => $childId,
            'phase' => $wakeUp->phase,
            'name' => $wakeUp->name,
            'icon' => $wakeUp->icon,
            'scheduled_at' => '2026-07-17 22:00:00',
            'status' => 'scheduled',
            'prompt_count' => 0,
            'created_at' => '2026-07-17 23:00:00',
            'updated_at' => '2026-07-17 23:00:00',
        ]);

        Artisan::call('migrate:rollback', [
            '--path' => 'database/migrations/2026_07_19_010001_correct_daily_task_scheduled_at_timezone.php',
        ]);

        $this->assertSame(
            '2026-07-18 07:00:00',
            DB::table('daily_tasks')->where('name', '起床')->value('scheduled_at'),
        );
    }
}
