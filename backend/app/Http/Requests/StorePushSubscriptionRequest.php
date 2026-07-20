<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StorePushSubscriptionRequest extends FormRequest
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
            'endpoint' => ['required', 'string', 'max:2000'],
            'public_key' => ['nullable', 'string', 'max:191'],
            'auth_token' => ['nullable', 'string', 'max:191'],
            'user_agent' => ['nullable', 'string', 'max:255'],
        ];
    }
}
