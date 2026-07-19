<?php

namespace App\Support;

use App\Models\FamilyMember;

final class FamilyMemberResolver
{
    public static function childId(): int
    {
        return FamilyMember::query()
            ->where('role', 'child')
            ->valueOrFail('id');
    }

    public static function motherId(): int
    {
        return FamilyMember::query()
            ->where('role', 'mother')
            ->valueOrFail('id');
    }
}
