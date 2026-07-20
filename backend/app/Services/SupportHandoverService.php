<?php

namespace App\Services;

use App\Models\SupportHandover;
use App\Support\FamilyMemberResolver;
use App\Support\JstDate;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class SupportHandoverService
{
    /**
     * @return Collection<int, SupportHandover>
     */
    public function list(?string $date = null, ?string $status = null): Collection
    {
        $query = SupportHandover::query()
            ->whereNull('cancelled_at')
            ->orderByDesc('updated_at');

        if ($date !== null) {
            $query->whereDate('local_date', $date);
        }

        if ($status !== null) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    /**
     * @param  array{
     *   title: string,
     *   assignee_label: string,
     *   conditions_text: string,
     *   completion_criteria: string,
     *   source_kind: string,
     *   status?: string|null,
     *   result_text?: string|null,
     *   due_at?: string|null,
     *   local_date?: string|null
     * }  $input
     */
    public function create(array $input): SupportHandover
    {
        $this->assertSourceKind($input['source_kind']);

        return SupportHandover::query()->create([
            'title' => $input['title'],
            'assignee_label' => $input['assignee_label'],
            'conditions_text' => $input['conditions_text'],
            'completion_criteria' => $input['completion_criteria'],
            'result_text' => $input['result_text'] ?? null,
            'status' => $input['status'] ?? 'open',
            'source_kind' => $input['source_kind'],
            'due_at' => $input['due_at'] ?? null,
            'local_date' => $input['local_date'] ?? JstDate::today(),
            'recorded_by_member_id' => FamilyMemberResolver::motherId(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function update(int $id, array $input): SupportHandover
    {
        $handover = SupportHandover::query()
            ->whereNull('cancelled_at')
            ->whereKey($id)
            ->first();

        if ($handover === null) {
            throw (new ModelNotFoundException)->setModel(SupportHandover::class, [$id]);
        }

        if (isset($input['source_kind'])) {
            $this->assertSourceKind((string) $input['source_kind']);
        }

        if (isset($input['status'])) {
            $this->assertStatus((string) $input['status']);
        }

        foreach (['title', 'assignee_label', 'conditions_text', 'completion_criteria', 'status', 'source_kind', 'local_date'] as $field) {
            if (array_key_exists($field, $input)) {
                $handover->{$field} = $input[$field];
            }
        }

        if (array_key_exists('result_text', $input)) {
            $handover->result_text = $input['result_text'];
        }

        if (array_key_exists('due_at', $input)) {
            $handover->due_at = $input['due_at'];
        }

        if (($input['status'] ?? null) === 'returned' && $handover->returned_to_mother_at === null) {
            $handover->returned_to_mother_at = now('UTC');
        }

        $handover->save();

        return $handover->refresh();
    }

    public function cancel(int $id): SupportHandover
    {
        $handover = SupportHandover::query()->whereKey($id)->first();

        if ($handover === null) {
            throw (new ModelNotFoundException)->setModel(SupportHandover::class, [$id]);
        }

        if ($handover->cancelled_at === null) {
            $handover->cancelled_at = now('UTC');
            $handover->save();
        }

        return $handover;
    }

    private function assertSourceKind(string $kind): void
    {
        if (! in_array($kind, ['child_statement', 'mother_confirmed', 'mother_observation', 'mother_assumption'], true)) {
            throw ValidationException::withMessages([
                'source_kind' => ['情報源の区分が正しくありません。'],
            ]);
        }
    }

    private function assertStatus(string $status): void
    {
        if (! in_array($status, ['open', 'in_progress', 'done', 'returned'], true)) {
            throw ValidationException::withMessages([
                'status' => ['状態の指定が正しくありません。'],
            ]);
        }
    }
}
