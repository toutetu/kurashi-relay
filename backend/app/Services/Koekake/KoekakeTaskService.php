<?php

namespace App\Services\Koekake;

use App\Models\DailyTask;
use App\Models\PromptTemplate;
use App\Models\RoutineTemplate;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class KoekakeTaskService
{
    /**
     * @return array{date: string, tasks: list<array<string, mixed>>}
     */
    public function listTasks(?string $date, ?string $phase): array
    {
        $taskDate = $date ?? JstDate::today();

        $this->ensureDailyTasks($taskDate);

        $query = DailyTask::query()
            ->with([
                'routineTemplate',
                'completionEvent',
                'reminderSchedules' => fn ($q) => $q->where('status', 'scheduled')->orderBy('remind_at'),
            ])
            ->where('task_date', $taskDate)
            ->join('routine_templates', 'daily_tasks.routine_template_id', '=', 'routine_templates.id')
            ->orderBy('routine_templates.sort_order')
            ->select('daily_tasks.*');

        if ($phase !== null) {
            $query->where('daily_tasks.phase', $phase);
        }

        $tasks = $query->get();

        return [
            'date' => $taskDate,
            'tasks' => $tasks->map(fn (DailyTask $task): array => $this->formatTaskSummary($task))->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function showTask(int $id): array
    {
        $task = DailyTask::query()
            ->with([
                'routineTemplate.promptTemplates',
                'completionEvent',
                'promptEvents' => fn ($q) => $q->whereNull('cancelled_at')->orderBy('prompted_at'),
                'reminderSchedules' => fn ($q) => $q->where('status', 'scheduled')->orderBy('remind_at'),
            ])
            ->findOrFail($id);

        $summary = $this->formatTaskSummary($task);

        $summary['prompts'] = $task->promptEvents->map(fn ($event): array => [
            'id' => $event->id,
            'prompted_at' => $this->formatDateTime($event->prompted_at),
            'prompt_text' => $event->prompt_text,
            'source' => $event->source,
        ])->all();

        $summary['prompt_candidates'] = $this->buildPromptCandidates($task->routineTemplate->promptTemplates);

        $summary['reminders'] = $task->reminderSchedules->map(fn ($reminder): array => [
            'id' => $reminder->id,
            'remind_at' => $this->formatDateTime($reminder->remind_at),
        ])->all();

        return $summary;
    }

    public function ensureDailyTasks(string $taskDate): void
    {
        $templates = RoutineTemplate::query()
            ->where('is_active', true)
            ->get();

        $rows = $templates->map(function (RoutineTemplate $template) use ($taskDate): array {
            return [
                'task_date' => $taskDate,
                'routine_template_id' => $template->id,
                'phase' => $template->phase,
                'name' => $template->name,
                'icon' => $template->icon,
                'scheduled_at' => $this->buildScheduledAt($taskDate, $template->default_time),
                'status' => 'scheduled',
                'prompt_count' => 0,
                'created_at' => now('UTC'),
                'updated_at' => now('UTC'),
            ];
        })->all();

        if ($rows !== []) {
            DailyTask::query()->insertOrIgnore($rows);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function formatTaskSummary(DailyTask $task): array
    {
        $task->loadMissing([
            'routineTemplate',
            'completionEvent',
            'reminderSchedules' => fn ($q) => $q->where('status', 'scheduled')->orderBy('remind_at'),
        ]);

        $nextRemindAt = $task->reminderSchedules->first()?->remind_at;

        return [
            'id' => $task->id,
            'activity_key' => $task->routineTemplate->activity_key,
            'phase' => $task->phase,
            'name' => $task->name,
            'icon' => $task->icon,
            'status' => $task->status,
            'scheduled_at' => $task->scheduled_at !== null ? $this->formatDateTime($task->scheduled_at) : null,
            'prompt_count' => $task->prompt_count,
            'latest_prompt_at' => $task->latest_prompt_at !== null ? $this->formatDateTime($task->latest_prompt_at) : null,
            'next_remind_at' => $nextRemindAt !== null ? $this->formatDateTime($nextRemindAt) : null,
            'suggested_prompt' => $this->resolveSuggestedPrompt($task->routine_template_id, $task->prompt_count),
            'completion' => $task->completionEvent !== null ? [
                'status' => $task->completionEvent->status,
                'completed_at' => $this->formatDateTime($task->completionEvent->completed_at),
                'note' => $task->completionEvent->note,
            ] : null,
        ];
    }

    /**
     * @return array{prompt_template_id: int, level: int, text: string}|null
     */
    public function resolveSuggestedPrompt(int $routineTemplateId, int $promptCount): ?array
    {
        $targetLevel = min($promptCount + 1, 3);

        $templates = PromptTemplate::query()
            ->where('routine_template_id', $routineTemplateId)
            ->orderByDesc('is_preferred')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('prompt_level');

        for ($level = $targetLevel; $level >= 1; $level--) {
            /** @var Collection<int, PromptTemplate>|null $levelTemplates */
            $levelTemplates = $templates->get($level);

            if ($levelTemplates !== null && $levelTemplates->isNotEmpty()) {
                $template = $levelTemplates->first();

                return [
                    'prompt_template_id' => $template->id,
                    'level' => $level,
                    'text' => $template->text,
                ];
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, PromptTemplate>  $templates
     * @return list<array{level: int, items: list<array{prompt_template_id: int, text: string, is_preferred: bool}>}>
     */
    public function buildPromptCandidates(Collection $templates): array
    {
        return $templates
            ->groupBy('prompt_level')
            ->sortKeys()
            ->map(fn (Collection $levelTemplates, int|string $level): array => [
                'level' => (int) $level,
                'items' => $levelTemplates
                    ->sortBy([
                        ['is_preferred', 'desc'],
                        ['sort_order', 'asc'],
                    ])
                    ->values()
                    ->map(fn (PromptTemplate $template): array => [
                        'prompt_template_id' => $template->id,
                        'text' => $template->text,
                        'is_preferred' => $template->is_preferred,
                    ])
                    ->all(),
            ])
            ->values()
            ->all();
    }

    public function formatDateTime(\DateTimeInterface $dateTime): string
    {
        return CarbonImmutable::instance($dateTime)
            ->timezone(JstDate::TIMEZONE)
            ->toIso8601String();
    }

    private function buildScheduledAt(string $taskDate, ?string $defaultTime): ?CarbonImmutable
    {
        if ($defaultTime === null) {
            return null;
        }

        $time = substr($defaultTime, 0, 5);

        return CarbonImmutable::parse($taskDate.' '.$time, JstDate::TIMEZONE);
    }
}
