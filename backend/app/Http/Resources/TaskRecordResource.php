<?php

namespace App\Http\Resources;

use App\Models\TaskRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TaskRecord */
final class TaskRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'member' => $this->familyMember->role,
            'task' => $this->taskDefinition->slug,
            'task_title' => $this->taskDefinition->title,
            'record_date' => $this->record_date->toDateString(),
            'completed_at' => $this->completed_at->timezone('Asia/Tokyo')->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->timezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
