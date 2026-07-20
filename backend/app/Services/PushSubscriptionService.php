<?php

namespace App\Services;

use App\Models\PushSubscription;

final class PushSubscriptionService
{
    /**
     * @param  array{
     *   endpoint: string,
     *   public_key?: string|null,
     *   auth_token?: string|null,
     *   user_agent?: string|null
     * }  $input
     */
    public function register(array $input): PushSubscription
    {
        return PushSubscription::query()->updateOrCreate(
            ['endpoint' => $input['endpoint']],
            [
                'public_key' => $input['public_key'] ?? null,
                'auth_token' => $input['auth_token'] ?? null,
                'user_agent' => $input['user_agent'] ?? null,
                'is_active' => true,
            ],
        );
    }

    /**
     * Reminder delivery is not implemented yet (stub).
     *
     * @return array{fired: bool, message: string}
     */
    public function fireReminderStub(): array
    {
        return [
            'fired' => false,
            'message' => '通知の配信は準備中です。登録だけ受け付けています。',
        ];
    }
}
