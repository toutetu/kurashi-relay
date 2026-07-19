<?php

namespace App\Http\Requests\Web;

use App\Support\JstDate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class RecordsIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.date_format' => '日付の形式が正しくありません。',
        ];
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
}
