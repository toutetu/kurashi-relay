<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateHomeEventRequest extends FormRequest
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
            'occurred_at' => ['sometimes', 'required', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:occurred_at'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ended_at.after_or_equal' => '終了時刻は開始時刻以降にしてください。',
        ];
    }
}
