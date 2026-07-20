<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateSupportHandoverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:120'],
            'assignee_label' => ['sometimes', 'string', 'max:80'],
            'conditions_text' => ['sometimes', 'string', 'max:2000'],
            'completion_criteria' => ['sometimes', 'string', 'max:2000'],
            'result_text' => ['nullable', 'string', 'max:2000'],
            'status' => ['sometimes', 'string', Rule::in(['open', 'in_progress', 'done', 'returned'])],
            'source_kind' => ['sometimes', 'string', Rule::in([
                'child_statement',
                'mother_confirmed',
                'mother_observation',
                'mother_assumption',
            ])],
            'due_at' => ['nullable', 'date'],
            'local_date' => ['sometimes', 'date_format:Y-m-d'],
        ];
    }
}
