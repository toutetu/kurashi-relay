<?php

namespace App\Http\Requests\Koekake;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCompletionRequest extends FormRequest
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
            'status' => [
                'required',
                'string',
                Rule::in(['completed', 'partial', 'together', 'parent_done', 'deferred', 'unknown']),
            ],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }
}
