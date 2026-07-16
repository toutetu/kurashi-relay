<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TaskIndexRequest;
use App\Http\Resources\TaskListResource;
use App\Models\FamilyMember;
use App\Services\TaskService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class TaskController extends Controller
{
    public function index(
        TaskIndexRequest $request,
        TaskService $service,
    ): TaskListResource {
        $member = $this->findMember($request->validated('member'));

        return new TaskListResource(
            $service->listForMember($member, $request->resolvedDate())
        );
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
