<?php

namespace App\Http\Requests\Koekake;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class StoreSnoozeRequest extends FormRequest
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
            'minutes' => ['nullable', 'integer', 'in:5,10,15'],
            'remind_at' => ['nullable', 'date'],
            'none_today' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasMinutes = $this->has('minutes') && $this->input('minutes') !== null;
            $hasRemindAt = $this->has('remind_at') && $this->input('remind_at') !== null;
            $hasNoneToday = $this->boolean('none_today');

            $count = (int) $hasMinutes + (int) $hasRemindAt + (int) $hasNoneToday;

            if ($count !== 1) {
                $validator->errors()->add('snooze', '再通知の指定方法は1つだけ選んでください。');
            }
        });
    }

    /**
     * @return array{minutes?: int, remind_at?: string, none_today?: bool}
     */
    public function resolvedPayload(): array
    {
        if ($this->boolean('none_today')) {
            return ['none_today' => true];
        }

        if ($this->has('minutes') && $this->input('minutes') !== null) {
            return ['minutes' => (int) $this->validated('minutes')];
        }

        return ['remind_at' => (string) $this->validated('remind_at')];
    }
}
