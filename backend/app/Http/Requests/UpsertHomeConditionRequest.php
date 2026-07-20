<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpsertHomeConditionRequest extends FormRequest
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
        $sources = ['self', 'guardian_confirmed', 'guardian_observation', 'mother_assumption'];

        return [
            'local_date' => ['nullable', 'date_format:Y-m-d'],
            'mother_physical' => ['nullable', 'integer', 'between:1,5'],
            'mother_mood' => ['nullable', 'integer', 'between:1,5'],
            'mother_source' => ['nullable', 'string', Rule::in($sources)],
            'daughter_physical' => ['nullable', 'integer', 'between:1,5'],
            'daughter_mood' => ['nullable', 'integer', 'between:1,5'],
            'daughter_source' => ['nullable', 'string', Rule::in($sources)],
        ];
    }
}
