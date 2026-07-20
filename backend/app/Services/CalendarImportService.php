<?php

namespace App\Services;

use App\Models\CalendarConnection;
use App\Models\CalendarEvent;
use App\Models\CalendarEventVersion;
use App\Models\PlannedActivity;
use App\Support\FamilyMemberResolver;
use App\Support\JstDate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CalendarImportService
{
    /**
     * Google Calendar API の events.items 相当を取り込み、planned_activities へ材料化する。
     *
     * @param  list<array<string, mixed>>  $events
     * @return array{imported: int, updated: int, cancelled: int}
     */
    public function importGoogleEvents(CalendarConnection $connection, array $events): array
    {
        $counts = ['imported' => 0, 'updated' => 0, 'cancelled' => 0];
        $subjectMemberId = FamilyMemberResolver::motherId();

        DB::transaction(function () use ($connection, $events, $subjectMemberId, &$counts): void {
            foreach ($events as $payload) {
                if (! is_array($payload)) {
                    continue;
                }

                $externalId = isset($payload['id']) && is_string($payload['id'])
                    ? $payload['id']
                    : null;
                if ($externalId === null || $externalId === '') {
                    continue;
                }

                $mapped = $this->mapGoogleEvent($payload);
                $event = CalendarEvent::query()->firstOrCreate(
                    [
                        'calendar_connection_id' => $connection->id,
                        'external_event_id' => $externalId,
                    ],
                );

                $latest = CalendarEventVersion::query()
                    ->where('calendar_event_id', $event->id)
                    ->orderByDesc('version_no')
                    ->first();

                $version = $latest;
                if ($latest === null || $this->versionChanged($latest, $mapped)) {
                    $nextNo = ($latest?->version_no ?? 0) + 1;
                    $version = CalendarEventVersion::query()->create([
                        'calendar_event_id' => $event->id,
                        'version_no' => $nextNo,
                        'provider_updated_at' => $mapped['provider_updated_at'],
                        'status' => $mapped['status'],
                        'title' => $mapped['title'],
                        'start_at' => $mapped['start_at'],
                        'end_at' => $mapped['end_at'],
                        'is_all_day' => $mapped['is_all_day'],
                        'location' => $mapped['location'],
                        'description' => $mapped['description'],
                        'raw_payload' => $payload,
                        'imported_at' => now('UTC'),
                    ]);
                }

                $result = $this->upsertPlannedActivity(
                    $connection,
                    $externalId,
                    $version,
                    $mapped,
                    $subjectMemberId,
                );

                $counts[$result]++;
            }
        });

        return $counts;
    }

    /**
     * OAuth未接続時のローカル確認用サンプル（当日 JST）。
     *
     * @return list<array<string, mixed>>
     */
    public function localSampleEvents(?string $localDate = null): array
    {
        $date = $localDate ?? JstDate::today();
        $day = CarbonImmutable::createFromFormat('Y-m-d', $date, 'Asia/Tokyo')
            ->startOfDay();

        return [
            [
                'id' => 'local-sample-morning',
                'status' => 'confirmed',
                'summary' => '就労準備（カレンダー取込サンプル）',
                'updated' => now('UTC')->toIso8601String(),
                'start' => ['dateTime' => $day->setTime(9, 0)->toIso8601String()],
                'end' => ['dateTime' => $day->setTime(11, 0)->toIso8601String()],
                'location' => null,
                'description' => 'ローカル確認用。GOOGLE_CALENDAR_ACCESS_TOKEN 設定後は実データに置き換わります。',
            ],
            [
                'id' => 'local-sample-afternoon',
                'status' => 'confirmed',
                'summary' => '通所・外出（カレンダー取込サンプル）',
                'updated' => now('UTC')->toIso8601String(),
                'start' => ['dateTime' => $day->setTime(13, 30)->toIso8601String()],
                'end' => ['dateTime' => $day->setTime(15, 0)->toIso8601String()],
                'location' => null,
                'description' => null,
            ],
            [
                'id' => 'local-sample-allday',
                'status' => 'confirmed',
                'summary' => '終日メモ（カレンダー取込サンプル）',
                'updated' => now('UTC')->toIso8601String(),
                'start' => ['date' => $date],
                'end' => ['date' => $day->addDay()->toDateString()],
                'location' => null,
                'description' => null,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{
     *   title: string,
     *   status: string,
     *   start_at: CarbonImmutable|null,
     *   end_at: CarbonImmutable|null,
     *   is_all_day: bool,
     *   local_date: string,
     *   location: string|null,
     *   description: string|null,
     *   provider_updated_at: CarbonImmutable|null
     * }
     */
    private function mapGoogleEvent(array $payload): array
    {
        $summary = isset($payload['summary']) && is_string($payload['summary'])
            ? trim($payload['summary'])
            : '';
        $title = $summary !== '' ? $summary : '(無題の予定)';
        $title = Str::limit($title, 100, '');

        $statusRaw = isset($payload['status']) && is_string($payload['status'])
            ? $payload['status']
            : 'confirmed';
        $status = $statusRaw === 'cancelled' ? 'cancelled' : 'confirmed';

        $start = is_array($payload['start'] ?? null) ? $payload['start'] : [];
        $end = is_array($payload['end'] ?? null) ? $payload['end'] : [];

        $isAllDay = isset($start['date']) && is_string($start['date']);
        $startAt = $this->parseGoogleDate($start, false);
        $endAt = $this->parseGoogleDate($end, true);

        if ($isAllDay && $startAt !== null) {
            $localDate = $startAt->timezone('Asia/Tokyo')->toDateString();
        } elseif ($startAt !== null) {
            $localDate = $startAt->timezone('Asia/Tokyo')->toDateString();
        } else {
            $localDate = JstDate::today();
        }

        $updated = null;
        if (isset($payload['updated']) && is_string($payload['updated'])) {
            $updated = CarbonImmutable::parse($payload['updated'])->utc();
        }

        $location = isset($payload['location']) && is_string($payload['location'])
            ? Str::limit($payload['location'], 200, '')
            : null;
        $description = isset($payload['description']) && is_string($payload['description'])
            ? $payload['description']
            : null;

        return [
            'title' => $title,
            'status' => $status,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'is_all_day' => $isAllDay,
            'local_date' => $localDate,
            'location' => $location,
            'description' => $description,
            'provider_updated_at' => $updated,
        ];
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function parseGoogleDate(array $node, bool $isEnd): ?CarbonImmutable
    {
        if (isset($node['dateTime']) && is_string($node['dateTime'])) {
            return CarbonImmutable::parse($node['dateTime'])->timezone('UTC');
        }

        if (isset($node['date']) && is_string($node['date'])) {
            // Google all-day end は exclusive。表示用に1日戻す。
            $day = CarbonImmutable::createFromFormat('Y-m-d', $node['date'], 'Asia/Tokyo')
                ?->startOfDay();
            if ($day === null) {
                return null;
            }
            if ($isEnd) {
                $day = $day->subDay()->endOfDay();
            }

            return $day->utc();
        }

        return null;
    }

    /**
     * @param  array{
     *   title: string,
     *   status: string,
     *   start_at: CarbonImmutable|null,
     *   end_at: CarbonImmutable|null,
     *   is_all_day: bool,
     *   local_date: string,
     *   location: string|null,
     *   description: string|null,
     *   provider_updated_at: CarbonImmutable|null
     * }  $mapped
     */
    private function versionChanged(CalendarEventVersion $latest, array $mapped): bool
    {
        if ($latest->title !== $mapped['title']
            || $latest->status !== $mapped['status']
            || (bool) $latest->is_all_day !== $mapped['is_all_day']
            || $latest->location !== $mapped['location']
            || $latest->description !== $mapped['description']
        ) {
            return true;
        }

        return ! $this->sameInstant($latest->start_at, $mapped['start_at'])
            || ! $this->sameInstant($latest->end_at, $mapped['end_at']);
    }

    private function sameInstant(mixed $left, mixed $right): bool
    {
        if ($left === null && $right === null) {
            return true;
        }
        if ($left === null || $right === null) {
            return false;
        }

        return CarbonImmutable::parse($left)->equalTo(CarbonImmutable::parse($right));
    }

    /**
     * @param  array{
     *   title: string,
     *   status: string,
     *   start_at: CarbonImmutable|null,
     *   end_at: CarbonImmutable|null,
     *   is_all_day: bool,
     *   local_date: string,
     *   location: string|null,
     *   description: string|null,
     *   provider_updated_at: CarbonImmutable|null
     * }  $mapped
     * @return 'imported'|'updated'|'cancelled'
     */
    private function upsertPlannedActivity(
        CalendarConnection $connection,
        string $externalId,
        CalendarEventVersion $version,
        array $mapped,
        int $subjectMemberId,
    ): string {
        $sourceKey = 'gcal:'.$connection->id.':'.$externalId;
        $existing = PlannedActivity::query()
            ->where('source_type', 'google_calendar')
            ->where('source_key', $sourceKey)
            ->first();

        $planStatus = $mapped['status'] === 'cancelled' ? 'cancelled' : 'planned';
        $attributes = [
            'subject_member_id' => $subjectMemberId,
            'activity_definition_id' => null,
            'source_type' => 'google_calendar',
            'source_key' => $sourceKey,
            'title_snapshot' => $mapped['title'],
            'category_snapshot' => null,
            'planned_start_at' => $mapped['start_at'],
            'planned_end_at' => $mapped['end_at'],
            'is_all_day' => $mapped['is_all_day'],
            'local_date' => $mapped['local_date'],
            'status' => $planStatus,
            'routine_template_id' => null,
            'plan_answer_version_id' => null,
            'calendar_event_version_id' => $version->id,
        ];

        if ($existing === null) {
            PlannedActivity::query()->create($attributes);

            return $planStatus === 'cancelled' ? 'cancelled' : 'imported';
        }

        $existing->fill($attributes);
        $existing->save();

        return $planStatus === 'cancelled' ? 'cancelled' : 'updated';
    }
}
