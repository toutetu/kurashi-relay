<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRecordRequest;
use App\Http\Resources\CancelTaskRecordResource;
use App\Http\Resources\StoreTaskRecordResource;
use App\Models\FamilyMember;
use App\Models\TaskDefinition;
use App\Services\TaskRecordService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class TaskRecordController extends Controller
{
    public function store(
        StoreTaskRecordRequest $request,
        TaskRecordService $service,
    ): StoreTaskRecordResource {
        $member = $this->findMember($request->validated('member'));
        $taskDefinition = $this->findTaskDefinition(
            $member->role,
            $request->validated('task'),
        );

        $result = $service->store(
            $member,
            $taskDefinition,
            $request->resolvedDate(),
            $request->validated('idempotency_key'),
            $request->resolvedSource(),
        );

        return new StoreTaskRecordResource($result);
    }

    public function destroy(
        int $id,
        TaskRecordService $service,
    ): CancelTaskRecordResource {
        $result = $service->cancel($id);

        return new CancelTaskRecordResource($result);
    }

    private function findMember(string $role): FamilyMember
    {
        $member = FamilyMember::query()->where('role', $role)->first();

        if ($member === null) {
            throw (new ModelNotFoundException)->setModel(FamilyMember::class);
        }

        return $member;
    }

    private function findTaskDefinition(string $role, string $slug): TaskDefinition
    {
        $definition = TaskDefinition::query()
            ->where('owner_role', $role)
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if ($definition === null) {
            throw (new ModelNotFoundException)->setModel(TaskDefinition::class);
        }

        return $definition;
    }
}
