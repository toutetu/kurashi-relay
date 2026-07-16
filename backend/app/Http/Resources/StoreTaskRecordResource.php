<?php

namespace App\Http\Resources;

use App\Models\RewardCollection;
use App\Models\TaskRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class StoreTaskRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{
         *     record: TaskRecord,
         *     summary: array<string, mixed>,
         *     revealed_reward: RewardCollection|null,
         *     deduplicated: bool,
         *     status_code: int
         * } $payload
         */
        $payload = $this->resource;

        $revealedReward = $payload['revealed_reward'];

        $data = [
            'record' => new TaskRecordResource($payload['record']),
            'summary' => $payload['summary'],
        ];

        if ($revealedReward !== null) {
            $data['revealed_reward'] = new RevealedRewardResource($revealedReward);
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        /** @var array{deduplicated: bool} $payload */
        $payload = $this->resource;

        return [
            'status' => 'success',
            'meta' => [
                'timezone' => 'Asia/Tokyo',
                'deduplicated' => $payload['deduplicated'],
            ],
        ];
    }

    public function withResponse(Request $request, $response): void
    {
        /** @var array{status_code: int} $payload */
        $payload = $this->resource;

        $response->setStatusCode($payload['status_code']);
    }
}
