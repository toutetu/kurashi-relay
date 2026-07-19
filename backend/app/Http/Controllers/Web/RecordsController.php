<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\RecordsIndexRequest;
use App\Models\FamilyMember;
use App\Services\TaskService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Inertia\Inertia;
use Inertia\Response;

final class RecordsController extends Controller
{
    public function index(RecordsIndexRequest $request, TaskService $service): Response
    {
        $date = $request->resolvedDate();

        return Inertia::render('Records/Index', [
            'date' => $date,
            'today' => now(config('kurashi.timezone'))->toDateString(),
            'child' => $service->listForMember($this->findMember('child'), $date),
            'mother' => $service->listForMember($this->findMember('mother'), $date),
        ]);
    }

    private function findMember(string $role): FamilyMember
    {
        $member = FamilyMember::query()->where('role', $role)->first();

        if ($member === null) {
            throw (new ModelNotFoundException)->setModel(FamilyMember::class);
        }

        return $member;
    }
}
