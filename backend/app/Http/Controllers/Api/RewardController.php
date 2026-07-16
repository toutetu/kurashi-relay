<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RewardCollectionsRequest;
use App\Http\Requests\RewardSummaryRequest;
use App\Http\Resources\RewardCollectionsResource;
use App\Http\Resources\RewardSummaryResource;
use App\Models\FamilyMember;
use App\Services\RewardCalculator;
use App\Services\TaskRecordService;
use App\Support\JstDate;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RewardController extends Controller
{
    public function summary(
        RewardSummaryRequest $request,
        RewardCalculator $calculator,
    ): RewardSummaryResource {
        $member = $this->findMember($request->validated('member'));

        return new RewardSummaryResource(
            $calculator->summary($member, JstDate::today())
        );
    }

    public function collections(
        RewardCollectionsRequest $request,
        TaskRecordService $service,
    ): RewardCollectionsResource {
        $member = $this->findMember($request->validated('member'));

        return new RewardCollectionsResource([
            'member' => $member->role,
            'collections' => $service->collectionsForMember($member),
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
