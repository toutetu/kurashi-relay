<?php

namespace App\Support;

use App\Models\ActivityEvent;
use Carbon\CarbonInterface;
use Database\Support\ActivityDefinitionCatalog;

final class ActivityEventTime
{
    /**
     * 表示・重なり判定用の終了時刻。
     * 継続活動(クイック活動/カレンダー)で未終了なら +30分、それ以外(声かけ等)は開始と同じ。
     */
    public static function effectiveEnd(ActivityEvent $event): CarbonInterface
    {
        if ($event->ended_at !== null) {
            return $event->ended_at;
        }

        $key = $event->activityDefinition?->activity_key;
        if ($key !== null && in_array($key, self::durationActivityKeys(), true)) {
            return $event->occurred_at->copy()->addMinutes(30);
        }

        return $event->occurred_at->copy();
    }

    /**
     * @return list<string>
     */
    public static function durationActivityKeys(): array
    {
        return [
            ...array_values(ActivityDefinitionCatalog::quickActivityDefinitionKeys()),
            ActivityDefinitionCatalog::calendarActivityDefinitionKey(),
        ];
    }
}
