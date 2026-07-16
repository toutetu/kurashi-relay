<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

abstract class MemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function memberRules(): array
    {
        return [
            'member' => ['required', 'string', 'in:mother,child'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function memberMessages(): array
    {
        return [
            'member.required' => 'メンバーを指定してください。',
            'member.in' => 'メンバーは mother または child を指定してください。',
        ];
    }
}
