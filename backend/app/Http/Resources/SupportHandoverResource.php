<?php

namespace App\Http\Resources;

use App\Models\SupportHandover;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SupportHandover */
final class SupportHandoverResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SupportHandover $item */
        $item = $this->resource;

        return [
            'id' => $item->id,
            'title' => $item->title,
            'assignee_label' => $item->assignee_label,
            'conditions_text' => $item->conditions_text,
            'completion_criteria' => $item->completion_criteria,
            'result_text' => $item->result_text,
            'returned_to_mother_at' => $item->returned_to_mother_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'status' => $item->status,
            'source_kind' => $item->source_kind,
            'due_at' => $item->due_at?->timezone('Asia/Tokyo')->toIso8601String(),
            'local_date' => $item->local_date?->toDateString(),
            'cancelled_at' => $item->cancelled_at?->timezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
