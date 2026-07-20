<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListPlannedActivitiesRequest extends FormRequest
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
            'date' => ['required', 'date_format:Y-m-d'],
            'subject' => ['nullable', 'string', Rule::in(['mother', 'child'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.required' => '日付を指定してください。',
            'date.date_format' => '日付の形式が正しくありません。',
            'subject.in' => 'subject は mother または child を指定してください。',
        ];
    }
}
