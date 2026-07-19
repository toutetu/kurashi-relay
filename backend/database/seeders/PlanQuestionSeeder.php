<?php

namespace Database\Seeders;

use App\Models\ActivityDefinition;
use App\Models\PlanQuestion;
use Illuminate\Database\Seeder;

class PlanQuestionSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            [
                'question_key' => 'today_task',
                'label' => 'いまから何する?',
                'answer_type' => 'multi_select',
                'mode_rule' => null,
                'activity_definition_id' => null,
                'sort_order' => 1,
            ],
            [
                'question_key' => 'tomorrow_item',
                'label' => '明日何がいる?',
                'answer_type' => 'multi_select',
                'mode_rule' => null,
                'activity_definition_id' => null,
                'sort_order' => 2,
            ],
            [
                'question_key' => 'tomorrow_plan',
                'label' => '明日なにする?',
                'answer_type' => 'multi_select',
                'mode_rule' => null,
                'activity_definition_id' => ActivityDefinition::query()
                    ->where('activity_key', 'ACT-043')
                    ->value('id'),
                'sort_order' => 3,
            ],
            [
                'question_key' => 'wake_up_time',
                'label' => '明日何時に起きる?',
                'answer_type' => 'time',
                'mode_rule' => 'summer',
                'activity_definition_id' => ActivityDefinition::query()
                    ->where('activity_key', 'ACT-037')
                    ->value('id'),
                'sort_order' => 4,
            ],
            [
                'question_key' => 'school_start_period',
                'label' => '何時間目から登校?',
                'answer_type' => 'choice',
                'mode_rule' => 'school',
                'activity_definition_id' => ActivityDefinition::query()
                    ->where('activity_key', 'ACT-035')
                    ->value('id'),
                'sort_order' => 5,
            ],
            [
                'question_key' => 'memo',
                'label' => 'メモ',
                'answer_type' => 'text',
                'mode_rule' => null,
                'activity_definition_id' => null,
                'sort_order' => 6,
            ],
            [
                'question_key' => 'today_item',
                'label' => '今日 何がいる？',
                'answer_type' => 'multi_select',
                'mode_rule' => 'summer',
                'activity_definition_id' => null,
                'sort_order' => 7,
            ],
            [
                'question_key' => 'bedtime',
                'label' => '今日 何時に寝る？',
                'answer_type' => 'time',
                'mode_rule' => 'summer',
                'activity_definition_id' => ActivityDefinition::query()
                    ->where('activity_key', 'ACT-025')
                    ->value('id'),
                'sort_order' => 8,
            ],
        ];

        foreach ($questions as $question) {
            PlanQuestion::query()->updateOrCreate(
                ['question_key' => $question['question_key']],
                [
                    'label' => $question['label'],
                    'answer_type' => $question['answer_type'],
                    'mode_rule' => $question['mode_rule'],
                    'activity_definition_id' => $question['activity_definition_id'],
                    'sort_order' => $question['sort_order'],
                    'is_active' => true,
                ],
            );
        }
    }
}
