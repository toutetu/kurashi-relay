<?php

namespace App\Http\Resources;

use App\Models\TaskRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TaskRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        if (is_array($this->resource)) {
            return $this->resource;
        }

        /** @var TaskRecord $record */
        $record = $this->resource;

        return [
            'id' => $record->id,
            'member' => $record->familyMember->role,
            'task' => $record->taskDefinition->slug,
            'task_title' => $record->taskDefinition->title,
            'record_date' => $record->record_date->toDateString(),
            'completed_at' => $record->completed_at->timezone('Asia/Tokyo')->toIso8601String(),
            'cancelled_at' => $record->cancelled_at?->timezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
