<?php

namespace App\Http\Resources;

use App\Models\TaskRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CancelTaskRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{
         *     record: TaskRecord,
         *     summary: array<string, mixed>
         * } $payload
         */
        $payload = $this->resource;

        return [
            'record' => new TaskRecordResource($payload['record']),
            'summary' => $payload['summary'],
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
