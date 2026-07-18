<?php

namespace App\Http\Requests\Musume;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ReplacePlanItemsRequest extends FormRequest
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
            'category' => ['required', 'string', Rule::in(['today_task', 'tomorrow_plan', 'tomorrow_item', 'memo'])],
            'titles' => ['present', 'array'],
            'titles.*' => ['required', 'string', 'max:100'],
            'decided_with' => ['nullable', 'string', Rule::in(['mama'])],
        ];
    }
}
