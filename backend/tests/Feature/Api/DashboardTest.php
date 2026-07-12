<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    public function test_dashboard_returns_the_complete_payload_for_the_base_date(): void
    {
        $response = $this->getJson('/api/dashboard');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.date', '2026-07-12')
            ->assertJsonPath('meta.timezone', 'Asia/Tokyo')
            ->assertJsonStructure([
                'status',
                'data' => [
                    'date',
                    'currentActivity',
                    'nextPlans',
                    'quickLogs',
                    'conditions' => ['mother', 'daughter'],
                    'childStrategy',
                    'timeBalance',
                    'scheduleImpactSummary',
                    'actionItems',
                    'lastWar',
                    'scheduleComparisons',
                ],
                'meta' => ['timezone'],
            ]);
    }

    public function test_dashboard_uses_the_requested_date_for_all_fixture_timestamps(): void
    {
        $response = $this->getJson('/api/dashboard?date=2026-07-13');

        $response
            ->assertOk()
            ->assertJsonPath('data.date', '2026-07-13')
            ->assertJsonPath('data.currentActivity.startedAt', '2026-07-13T08:12:00+09:00')
            ->assertJsonPath('data.scheduleComparisons.0.timeRange.start', '2026-07-13T08:00:00+09:00')
            ->assertJsonPath('data.actionItems.1.dueAt', '2026-07-16T17:00:00+09:00');
    }

    public function test_dashboard_rejects_an_invalid_date_with_the_common_error_shape(): void
    {
        $response = $this->getJson('/api/dashboard?date=2026-7-13');

        $response
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', '入力内容を確認してください。')
            ->assertJsonPath('errors.date.0', '日付の形式が正しくありません。');
    }

    public function test_dashboard_accepts_a_leap_day_and_rejects_dates_that_overflow_fixture_offsets(): void
    {
        $this->getJson('/api/dashboard?date=2028-02-29')
            ->assertOk()
            ->assertJsonPath('data.date', '2028-02-29');

        $this->getJson('/api/dashboard?date=9999-12-29')
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('errors.date.0', '日付は9999年12月28日以前を指定してください。');
    }

    public function test_an_empty_date_uses_the_base_date(): void
    {
        $this->getJson('/api/dashboard?date=')
            ->assertOk()
            ->assertJsonPath('data.date', '2026-07-12');
    }

    public function test_dashboard_includes_unplanned_activity_and_no_record_periods(): void
    {
        $response = $this->getJson('/api/dashboard');

        $response->assertOk();

        /** @var array<int, array<string, mixed>> $comparisons */
        $comparisons = $response->json('data.scheduleComparisons');

        $hasUnplannedActivity = collect($comparisons)->contains(
            fn (array $comparison): bool => $comparison['plan'] === null
                && count($comparison['actuals']) > 0
                && $comparison['difference']['status'] === 'unplanned_activity'
        );
        $hasNoPlanNoRecord = collect($comparisons)->contains(
            fn (array $comparison): bool => $comparison['plan'] === null
                && count($comparison['actuals']) === 0
                && $comparison['difference']['status'] === 'no_plan_no_record'
        );

        $this->assertTrue($hasUnplannedActivity);
        $this->assertTrue($hasNoPlanNoRecord);
    }

    public function test_dashboard_fixture_keeps_plan_and_difference_times_consistent(): void
    {
        $response = $this->getJson('/api/dashboard');

        $response
            ->assertOk()
            ->assertJsonPath('data.nextPlans.1.endAt', '2026-07-12T15:00:00+09:00')
            ->assertJsonPath('data.scheduleComparisons.0.actuals.0.startAt', '2026-07-12T08:10:00+09:00')
            ->assertJsonPath('data.scheduleComparisons.0.actuals.0.endAt', '2026-07-12T09:00:00+09:00')
            ->assertJsonPath('data.scheduleComparisons.0.difference.status', 'delayed')
            ->assertJsonPath('data.scheduleComparisons.0.difference.startDelayMinutes', 10);
    }

    public function test_unknown_api_routes_return_json_errors(): void
    {
        $response = $this
            ->withHeader('Accept', 'text/html')
            ->get('/api/unknown');

        $response
            ->assertNotFound()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'エンドポイントが見つかりません。');
    }

    public function test_unsupported_methods_return_the_common_json_error(): void
    {
        $this->post('/api/dashboard')
            ->assertMethodNotAllowed()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', '許可されていないメソッドです。');
    }

    public function test_server_exceptions_return_generic_json_without_internal_details(): void
    {
        Route::get('/api/test-exception', fn () => throw new \RuntimeException('sensitive details'));

        $response = $this->getJson('/api/test-exception');

        $response
            ->assertInternalServerError()
            ->assertExactJson([
                'status' => 'error',
                'message' => 'データの取得中に問題が発生しました。',
            ])
            ->assertDontSee('sensitive details');
    }
}
