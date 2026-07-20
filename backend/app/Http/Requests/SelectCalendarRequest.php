<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SelectCalendarRequest extends FormRequest
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
            'external_calendar_id' => ['required', 'string', 'max:191'],
            'display_name' => ['nullable', 'string', 'max:120'],
        ];
    }
}
