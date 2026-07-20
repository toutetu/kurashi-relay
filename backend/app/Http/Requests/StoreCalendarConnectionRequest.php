<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCalendarConnectionRequest extends FormRequest
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
            'display_name' => ['required', 'string', 'max:120'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'external_calendar_id' => ['nullable', 'string', 'max:191'],
            'subject_role' => ['nullable', 'string', Rule::in(['mother', 'child'])],
        ];
    }
}
