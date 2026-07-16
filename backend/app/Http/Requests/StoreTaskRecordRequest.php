<?php

namespace App\Http\Requests;

use App\Support\JstDate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreTaskRecordRequest extends MemberRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_merge($this->memberRules(), [
            'task' => [
                'required',
                'string',
                Rule::exists('task_definitions', 'slug')->where(function ($query): void {
                    $query->where('owner_role', $this->input('member'))
                        ->where('is_active', true);
                }),
            ],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'min:8', 'max:64'],
            'source' => ['nullable', 'string', 'max:20'],
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return array_merge($this->memberMessages(), [
            'task.required' => 'タスクを指定してください。',
            'task.exists' => '指定されたタスクは見つかりません。',
            'date.date_format' => '日付の形式が正しくありません。',
            'idempotency_key.required' => 'idempotency_key を指定してください。',
            'idempotency_key.min' => 'idempotency_key は8文字以上で指定してください。',
            'idempotency_key.max' => 'idempotency_key は64文字以内で指定してください。',
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $date = $this->input('date');

            if (! is_string($date) || $date === '') {
                return;
            }

            if (JstDate::isFuture($date)) {
                $validator->errors()->add('date', '未来の日付は指定できません。');
            }

            if (JstDate::isTooFarInPast($date)) {
                $validator->errors()->add('date', '指定できる過去日付の範囲を超えています。');
            }
        });
    }

    public function resolvedDate(): string
    {
        $date = $this->validated('date');

        if (is_string($date) && $date !== '') {
            return $date;
        }

        return JstDate::today();
    }

    public function resolvedSource(): string
    {
        $source = $this->validated('source');

        return is_string($source) && $source !== '' ? $source : 'web';
    }
}
