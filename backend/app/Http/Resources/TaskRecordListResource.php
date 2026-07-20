<?php

namespace App\Http\Resources;

use App\Models\TaskRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TaskRecordListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{date: string, member: string, records: list<array<string, mixed>|TaskRecord>} $payload */
        $payload = $this->resource;

        return [
            'date' => $payload['date'],
            'member' => $payload['member'],
            'records' => TaskRecordResource::collection($payload['records']),
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
