<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateFamilySettingRequest extends FormRequest
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
            'day_type' => ['sometimes', 'string', Rule::in(['weekday', 'holiday', 'long_vacation'])],
            'report_exclude_last_war' => ['sometimes', 'boolean'],
            'display_note' => ['nullable', 'string', 'max:200'],
        ];
    }
}
