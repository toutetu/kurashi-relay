<?php

namespace App\Http\Requests\Musume;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdatePlanRequest extends FormRequest
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
            'mode' => ['sometimes', 'string', Rule::in(['school', 'summer', 'holiday', 'outing'])],
            'school_start_period' => [
                'sometimes',
                'nullable',
                'string',
                Rule::in([
                    'first_period',
                    'second_period',
                    'third_period',
                    'from_lunch',
                    'afternoon',
                    'decide_morning',
                    'absent',
                    'other',
                ]),
            ],
            'wake_up_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'today_state' => ['sometimes', 'string', Rule::in(['undecided', 'with_mama', 'decided'])],
            'tomorrow_items_state' => ['sometimes', 'string', Rule::in(['undecided', 'with_mama', 'decided'])],
            'start_state' => ['sometimes', 'string', Rule::in(['undecided', 'with_mama', 'decided'])],
        ];
    }
}
