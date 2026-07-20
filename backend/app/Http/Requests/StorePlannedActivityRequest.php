<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StorePlannedActivityRequest extends FormRequest
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
            'subject' => ['required', 'string', Rule::in(['mother', 'child'])],
            'title' => ['required', 'string', 'max:100'],
            'local_date' => ['required', 'date_format:Y-m-d'],
            'activity_definition_id' => [
                'nullable',
                'integer',
                Rule::exists('activity_definitions', 'id')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'planned_start_at' => ['nullable', 'date'],
            'planned_end_at' => ['nullable', 'date', 'after_or_equal:planned_start_at'],
            'is_all_day' => ['nullable', 'boolean'],
            'category_snapshot' => ['nullable', 'string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'subject.required' => '対象（母または娘）を指定してください。',
            'title.required' => '予定の名前を入力してください。',
            'local_date.required' => '日付を指定してください。',
            'planned_end_at.after_or_equal' => '終了時刻は開始時刻以降にしてください。',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $isAllDay = (bool) $this->boolean('is_all_day');
            $start = $this->input('planned_start_at');
            $end = $this->input('planned_end_at');

            if (! $isAllDay && (! is_string($start) || $start === '')) {
                $validator->errors()->add('planned_start_at', '開始時刻を指定するか、終日にしてください。');
            }

            if ($isAllDay && (is_string($end) && $end !== '')) {
                // end is optional for all-day; no error
            }
        });
    }
}
