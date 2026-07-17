<?php

namespace App\Services\Koekake;

use App\Models\CompletionEvent;
use App\Models\DailyTask;
use App\Models\ReminderSchedule;
use Illuminate\Support\Facades\DB;

final class CompletionService
{
    public function __construct(
        private readonly KoekakeTaskService $taskService,
    ) {}

    /**
     * @return array{
     *     task_id: int,
     *     status: string,
     *     completion: array{status: string, completed_at: string, note: string|null}
     * }
     */
    public function update(int $taskId, string $status, ?string $note): array
    {
        return DB::transaction(function () use ($taskId, $status, $note): array {
            $task = DailyTask::query()->lockForUpdate()->findOrFail($taskId);

            $completion = CompletionEvent::query()->updateOrCreate(
                ['daily_task_id' => $task->id],
                [
                    'status' => $status,
                    'completed_at' => now('UTC'),
                    'note' => $note,
                ],
            );

            $task->update(['status' => $status]);

            if (in_array($status, ['completed', 'together', 'parent_done', 'deferred'], true)) {
                ReminderSchedule::query()
                    ->where('daily_task_id', $task->id)
                    ->where('status', 'scheduled')
                    ->update(['status' => 'cancelled']);
            }

            return [
                'task_id' => $task->id,
                'status' => $task->status,
                'completion' => [
                    'status' => $completion->status,
                    'completed_at' => $this->taskService->formatDateTime($completion->completed_at),
                    'note' => $completion->note,
                ],
            ];
        });
    }
}
