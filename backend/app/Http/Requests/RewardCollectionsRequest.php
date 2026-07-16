<?php

namespace App\Http\Requests;

final class RewardCollectionsRequest extends MemberRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return $this->memberRules();
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->memberMessages();
    }
}
