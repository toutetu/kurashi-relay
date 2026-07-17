<?php

namespace App\Http\Requests\Koekake;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePromptEventRequest extends FormRequest
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
            'daily_task_id' => ['required', 'integer', 'exists:daily_tasks,id'],
            'prompt_text' => ['required', 'string', 'max:200'],
            'source' => ['required', 'string', Rule::in(['template', 'edited', 'custom'])],
            'idempotency_key' => ['required', 'string', 'max:64'],
        ];
    }
}
