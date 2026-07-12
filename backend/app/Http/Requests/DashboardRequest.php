<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class DashboardRequest extends FormRequest
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
            'date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:9999-12-28'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.date_format' => '日付の形式が正しくありません。',
            'date.before_or_equal' => '日付は9999年12月28日以前を指定してください。',
        ];
    }
}
