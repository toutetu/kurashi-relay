<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const JST = 'Asia/Tokyo';

    private const UTC = 'UTC';

    public function up(): void
    {
        $this->rewriteScheduledAt(self::JST);
    }

    public function down(): void
    {
        $this->rewriteScheduledAt(self::UTC);
    }

    private function rewriteScheduledAt(string $sourceTimezone): void
    {
        DB::table('daily_tasks')
            ->join('routine_templates', 'daily_tasks.routine_template_id', '=', 'routine_templates.id')
            ->whereNotNull('routine_templates.default_time')
            ->select([
                'daily_tasks.id',
                'daily_tasks.task_date',
                'routine_templates.default_time',
            ])
            ->orderBy('daily_tasks.id')
            ->chunkById(100, function ($tasks) use ($sourceTimezone): void {
                foreach ($tasks as $task) {
                    $time = substr((string) $task->default_time, 0, 5);
                    $scheduledAt = CarbonImmutable::parse(
                        $task->task_date.' '.$time,
                        $sourceTimezone,
                    )->utc();

                    DB::table('daily_tasks')
                        ->where('id', $task->id)
                        ->update([
                            'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
                        ]);
                }
            }, 'daily_tasks.id', 'id');
    }
};
