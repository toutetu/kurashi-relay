<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CompleteHomeEventRequest extends FormRequest
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
            'ended_at' => ['required', 'date'],
        ];
    }
}
