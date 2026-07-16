<?php

namespace Database\Seeders;

use App\Models\TaskDefinition;
use Illuminate\Database\Seeder;

class TaskDefinitionSeeder extends Seeder
{
    /**
     * @var list<array{slug: string, title: string, point_value: int}>
     */
    private const CHILD_TASKS = [
        ['slug' => 'kigae', 'title' => '自分で着替えた', 'point_value' => 0],
        ['slug' => 'fuku', 'title' => '脱いだ服をかごに入れた', 'point_value' => 0],
        ['slug' => 'shokki', 'title' => '食器を流しに運んだ', 'point_value' => 0],
        ['slug' => 'kaban', 'title' => 'カバンを棚に置いた', 'point_value' => 0],
        ['slug' => 'suito', 'title' => '水筒を流しに出した', 'point_value' => 0],
    ];

    /**
     * @var list<array{slug: string, title: string, point_value: int}>
     */
    private const MOTHER_TASKS = [
        ['slug' => 'shokki', 'title' => '食器を洗った', 'point_value' => 10],
        ['slug' => 'sentaku', 'title' => '洗濯を回して干した', 'point_value' => 10],
        ['slug' => 'nanashi', 'title' => '名もなき家事をやった', 'point_value' => 10],
        ['slug' => 'soji', 'title' => '床に掃除機をかけた', 'point_value' => 10],
        ['slug' => 'yuhan', 'title' => '夕飯を作った', 'point_value' => 10],
    ];

    public function run(): void
    {
        foreach (self::CHILD_TASKS as $index => $task) {
            TaskDefinition::query()->updateOrCreate(
                [
                    'owner_role' => 'child',
                    'slug' => $task['slug'],
                ],
                [
                    'category' => null,
                    'title' => $task['title'],
                    'point_value' => $task['point_value'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ],
            );
        }

        foreach (self::MOTHER_TASKS as $index => $task) {
            TaskDefinition::query()->updateOrCreate(
                [
                    'owner_role' => 'mother',
                    'slug' => $task['slug'],
                ],
                [
                    'category' => null,
                    'title' => $task['title'],
                    'point_value' => $task['point_value'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ],
            );
        }
    }
}
