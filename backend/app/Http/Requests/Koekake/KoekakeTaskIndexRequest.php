<?php

namespace App\Http\Requests\Koekake;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class KoekakeTaskIndexRequest extends FormRequest
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
            'date' => ['nullable', 'date_format:Y-m-d'],
            'phase' => ['nullable', 'string', Rule::in(['morning', 'evening', 'night'])],
        ];
    }
}
