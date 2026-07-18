<?php

namespace App\Http\Requests\Musume;

use Illuminate\Foundation\Http\FormRequest;

final class ShowPlanRequest extends FormRequest
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
        ];
    }
}
