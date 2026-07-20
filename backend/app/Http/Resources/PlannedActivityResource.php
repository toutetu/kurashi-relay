<?php

namespace App\Http\Resources;

use App\Models\PlannedActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PlannedActivity */
final class PlannedActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlannedActivity $activity */
        $activity = $this->resource;

        return [
            'id' => $activity->id,
            'subject' => $activity->subjectMember?->role,
            'subject_member_id' => $activity->subject_member_id,
            'activity_definition_id' => $activity->activity_definition_id,
            'activity_key' => $activity->activityDefinition?->activity_key,
            'source_type' => $activity->source_type,
            'title' => $activity->title_snapshot,
            'category' => $activity->category_snapshot,
            'planned_start_at' => $activity->planned_start_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'planned_end_at' => $activity->planned_end_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'is_all_day' => $activity->is_all_day,
            'local_date' => $activity->local_date?->toDateString(),
            'status' => $activity->status,
            'editable' => $activity->source_type === 'manual' && $activity->status !== 'cancelled',
        ];
    }
}
