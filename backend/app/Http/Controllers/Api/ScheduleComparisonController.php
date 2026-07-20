<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ScheduleComparisonService;
use App\Support\JstDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ScheduleComparisonController extends Controller
{
    public function __invoke(Request $request, ScheduleComparisonService $service): JsonResponse
    {
        $date = $request->query('date');
        $resolved = is_string($date) && $date !== '' ? $date : JstDate::today();
        $result = $service->forDate($resolved);

        return response()->json([
            'status' => 'success',
            'data' => [
                'date' => $resolved,
                'comparisons' => $result['comparisons'],
                'summary' => $result['summary'],
            ],
            'meta' => ['timezone' => 'Asia/Tokyo'],
        ]);
    }
}
