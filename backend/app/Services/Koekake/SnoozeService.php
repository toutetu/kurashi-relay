<?php

namespace App\Services\Koekake;

use App\Models\DailyTask;
use App\Models\ReminderSchedule;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class SnoozeService
{
    public function __construct(
        private readonly KoekakeTaskService $taskService,
    ) {}

    /**
     * @param  array{minutes?: int, remind_at?: string, none_today?: bool}  $payload
     * @return array{task_id: int, next_remind_at: string|null}
     */
    public function store(int $taskId, array $payload): array
    {
        return DB::transaction(function () use ($taskId, $payload): array {
            $task = DailyTask::query()->lockForUpdate()->findOrFail($taskId);

            ReminderSchedule::query()
                ->where('daily_task_id', $task->id)
                ->where('status', 'scheduled')
                ->update(['status' => 'cancelled']);

            $nextRemindAt = null;

            if (array_key_exists('minutes', $payload)) {
                $nextRemindAt = JstDate::now()->addMinutes($payload['minutes']);
                $this->createReminder($task->id, $nextRemindAt);
            } elseif (array_key_exists('remind_at', $payload)) {
                $nextRemindAt = CarbonImmutable::parse($payload['remind_at'])->timezone(JstDate::TIMEZONE);
                $this->validateRemindAt($nextRemindAt, $task);
                $this->createReminder($task->id, $nextRemindAt);
            }

            return [
                'task_id' => $task->id,
                'next_remind_at' => $nextRemindAt !== null
                  ? $this->taskService->formatDateTime($nextRemindAt)
                  : null,
            ];
        });
    }

    private function createReminder(int $dailyTaskId, CarbonImmutable $remindAt): void
    {
        ReminderSchedule::query()->create([
            'daily_task_id' => $dailyTaskId,
            'remind_at' => $remindAt->utc(),
            'status' => 'scheduled',
        ]);
    }

    private function validateRemindAt(CarbonImmutable $remindAt, DailyTask $task): void
    {
        $taskDate = $task->task_date->toDateString();
        $now = JstDate::now();

        if ($remindAt->toDateString() !== $taskDate || $remindAt->lessThanOrEqualTo($now)) {
            throw ValidationException::withMessages([
                'remind_at' => ['再通知時刻は当日内かつ未来の時刻を指定してください。'],
            ]);
        }
    }
}
