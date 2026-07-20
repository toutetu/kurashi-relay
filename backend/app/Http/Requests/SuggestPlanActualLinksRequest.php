<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SuggestPlanActualLinksRequest extends FormRequest
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
        ];
    }
}
