<?php

namespace App\Http\Requests\Musume;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CompleteReflectionRequest extends FormRequest
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
            'mode' => ['required', 'string', Rule::in(['normal', 'summer'])],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }
}
