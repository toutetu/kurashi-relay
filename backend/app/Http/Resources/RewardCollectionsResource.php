<?php

namespace App\Http\Resources;

use App\Models\RewardCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class RewardCollectionsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{member: string, collections: list<RewardCollection>} $payload */
        $payload = $this->resource;

        return [
            'member' => $payload['member'],
            'collections' => RewardCollectionItemResource::collection($payload['collections']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'status' => 'success',
            'meta' => [
                'timezone' => 'Asia/Tokyo',
            ],
        ];
    }
}
