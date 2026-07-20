<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class UpdatePlannedActivityRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:100'],
            'local_date' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'activity_definition_id' => [
                'nullable',
                'integer',
                Rule::exists('activity_definitions', 'id')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'planned_start_at' => ['nullable', 'date'],
            'planned_end_at' => ['nullable', 'date'],
            'is_all_day' => ['nullable', 'boolean'],
            'category_snapshot' => ['nullable', 'string', 'max:30'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $start = $this->input('planned_start_at');
            $end = $this->input('planned_end_at');

            if (is_string($start) && $start !== '' && is_string($end) && $end !== '' && $end < $start) {
                $validator->errors()->add('planned_end_at', '終了時刻は開始時刻以降にしてください。');
            }
        });
    }
}
