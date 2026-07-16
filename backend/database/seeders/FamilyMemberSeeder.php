<?php

namespace Database\Seeders;

use App\Models\FamilyMember;
use Illuminate\Database\Seeder;

class FamilyMemberSeeder extends Seeder
{
    public function run(): void
    {
        FamilyMember::query()->updateOrCreate(
            ['role' => 'mother'],
            ['display_name' => 'ママ'],
        );

        FamilyMember::query()->updateOrCreate(
            ['role' => 'child'],
            ['display_name' => 'むすめ'],
        );
    }
}
