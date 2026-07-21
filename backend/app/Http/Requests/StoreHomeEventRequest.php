<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreHomeEventRequest extends FormRequest
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
            'activity_definition_id' => [
                'nullable',
                'required_without:planned_activity_id',
                'integer',
                Rule::exists('activity_definitions', 'id')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'planned_activity_id' => [
                'nullable',
                'integer',
                Rule::exists('planned_activities', 'id'),
            ],
            'idempotency_key' => ['required', 'string', 'max:64'],
            'occurred_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:occurred_at'],
            'note' => ['nullable', 'string', 'max:500'],
            'event_type' => ['nullable', 'string', Rule::in(['activity', 'support'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'activity_definition_id.required_without' => '記録する活動を選んでください。',
            'idempotency_key.required' => '再送防止キーが必要です。',
        ];
    }
}
