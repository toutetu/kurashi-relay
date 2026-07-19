<?php

namespace Database\Seeders;

use App\Models\ActivityDefinition;
use App\Models\PromptTemplate;
use App\Models\RoutineTemplate;
use App\Support\FamilyMemberResolver;
use Database\Support\RoutineTemplateSlugCatalog;
use Illuminate\Database\Seeder;

class KoekakeSeeder extends Seeder
{
    public function run(): void
    {
        $childMemberId = FamilyMemberResolver::childId();
        $routines = $this->routineDefinitions();
        $promptTexts = $this->promptTexts();

        foreach ($routines as $routine) {
            $slug = RoutineTemplateSlugCatalog::slugFor($routine['phase'], $routine['sort_order']);
            $activityDefinition = ActivityDefinition::query()
                ->where('activity_key', $routine['activity_key'])
                ->firstOrFail();

            $promptKey = $routine['phase'].'::'.$routine['name'];
            $promptLevels = $promptTexts[$promptKey] ?? $promptTexts[$routine['name']] ?? null;

            if ($promptLevels === null) {
                continue;
            }

            $template = RoutineTemplate::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'activity_definition_id' => $activityDefinition->id,
                    'subject_member_id' => $childMemberId,
                    'activity_key' => $activityDefinition->activity_key,
                    'phase' => $routine['phase'],
                    'name' => $routine['name'],
                    'icon' => $routine['icon'],
                    'parent_prompt_label' => $activityDefinition->parent_prompt_label,
                    'child_label' => $activityDefinition->child_label,
                    'quick_label' => $activityDefinition->quick_label,
                    'default_time' => $routine['default_time'],
                    'daily_limit' => $routine['daily_limit'],
                    'display_rule' => null,
                    'sort_order' => $routine['sort_order'],
                    'is_active' => true,
                ],
            );

            foreach ($promptLevels as $level => $text) {
                PromptTemplate::query()->updateOrCreate(
                    [
                        'routine_template_id' => $template->id,
                        'prompt_level' => $level,
                        'sort_order' => 0,
                    ],
                    [
                        'text' => $text,
                        'is_preferred' => false,
                    ],
                );
            }
        }
    }

    /**
     * @return list<array{
     *     phase: string,
     *     sort_order: int,
     *     name: string,
     *     icon: string,
     *     activity_key: string,
     *     daily_limit: int,
     *     default_time: string|null,
     *     parent_prompt_label: string,
     *     child_label: string,
     *     quick_label: string
     * }>
     */
    private function routineDefinitions(): array
    {
        return [
            ['phase' => 'morning', 'sort_order' => 1, 'name' => '起床', 'icon' => '⏰', 'activity_key' => 'ACT-037', 'daily_limit' => 1, 'default_time' => '07:00', 'parent_prompt_label' => '起きるように声をかけた', 'child_label' => '起きた', 'quick_label' => '起床の声かけ'],
            ['phase' => 'morning', 'sort_order' => 2, 'name' => '朝食', 'icon' => '🍞', 'activity_key' => 'ACT-004', 'daily_limit' => 3, 'default_time' => '07:20', 'parent_prompt_label' => 'ご飯を食べるように声をかけた', 'child_label' => 'ご飯を食べた', 'quick_label' => '食事の声かけ'],
            ['phase' => 'morning', 'sort_order' => 3, 'name' => '歯磨き', 'icon' => '🪥', 'activity_key' => 'ACT-005', 'daily_limit' => 2, 'default_time' => '07:40', 'parent_prompt_label' => '歯をみがくように声をかけた', 'child_label' => '歯をみがいた', 'quick_label' => '歯みがきの声かけ'],
            ['phase' => 'morning', 'sort_order' => 4, 'name' => '服薬', 'icon' => '💊', 'activity_key' => 'ACT-038', 'daily_limit' => 2, 'default_time' => '07:45', 'parent_prompt_label' => '薬を飲むように声をかけた', 'child_label' => '薬を飲んだ', 'quick_label' => '服薬の声かけ'],
            ['phase' => 'morning', 'sort_order' => 5, 'name' => '着替え', 'icon' => '👕', 'activity_key' => 'ACT-003', 'daily_limit' => 1, 'default_time' => '07:50', 'parent_prompt_label' => '着替えるように声をかけた', 'child_label' => '着替えた', 'quick_label' => '着替えの声かけ'],
            ['phase' => 'morning', 'sort_order' => 6, 'name' => '日焼け止め', 'icon' => '🧴', 'activity_key' => 'ACT-039', 'daily_limit' => 1, 'default_time' => '08:00', 'parent_prompt_label' => '日焼け止めを塗るように声をかけた', 'child_label' => '日焼け止めを塗った', 'quick_label' => '日焼け止めの声かけ'],
            ['phase' => 'morning', 'sort_order' => 7, 'name' => '持ち物', 'icon' => '🎒', 'activity_key' => 'ACT-040', 'daily_limit' => 1, 'default_time' => '08:05', 'parent_prompt_label' => '持ち物を確認するように声をかけた', 'child_label' => '今日の持ち物を確認した', 'quick_label' => '今日の持ち物確認の声かけ'],
            ['phase' => 'morning', 'sort_order' => 8, 'name' => '出発', 'icon' => '🚪', 'activity_key' => 'ACT-041', 'daily_limit' => 1, 'default_time' => '08:15', 'parent_prompt_label' => '出発するように声をかけた', 'child_label' => '時間までに出発できた', 'quick_label' => '出発の声かけ'],
            ['phase' => 'evening', 'sort_order' => 1, 'name' => '帰宅確認', 'icon' => '🏠', 'activity_key' => 'ACT-042', 'daily_limit' => 1, 'default_time' => null, 'parent_prompt_label' => '帰宅後にひと息つくよう声をかけた', 'child_label' => '帰ってきてひと息ついた', 'quick_label' => '帰宅後の声かけ'],
            ['phase' => 'evening', 'sort_order' => 2, 'name' => '今日の予定', 'icon' => '📋', 'activity_key' => 'ACT-043', 'daily_limit' => 1, 'default_time' => null, 'parent_prompt_label' => '今日することを確認するように声をかけた', 'child_label' => '今日することを確認した', 'quick_label' => '予定確認の声かけ'],
            ['phase' => 'evening', 'sort_order' => 3, 'name' => '宿題', 'icon' => '✏️', 'activity_key' => 'ACT-015', 'daily_limit' => 1, 'default_time' => '16:30', 'parent_prompt_label' => '宿題をするように声をかけた', 'child_label' => '宿題をした', 'quick_label' => '宿題実施の声かけ'],
            ['phase' => 'evening', 'sort_order' => 4, 'name' => '夕食', 'icon' => '🍚', 'activity_key' => 'ACT-004', 'daily_limit' => 3, 'default_time' => '18:00', 'parent_prompt_label' => 'ご飯を食べるように声をかけた', 'child_label' => 'ご飯を食べた', 'quick_label' => '食事の声かけ'],
            ['phase' => 'evening', 'sort_order' => 5, 'name' => '入浴', 'icon' => '🛁', 'activity_key' => 'ACT-019', 'daily_limit' => 1, 'default_time' => '18:30', 'parent_prompt_label' => 'お風呂に入るように声をかけた', 'child_label' => 'お風呂に入った', 'quick_label' => '入浴の声かけ'],
            ['phase' => 'evening', 'sort_order' => 6, 'name' => '食器片づけ', 'icon' => '🍽️', 'activity_key' => 'ACT-006', 'daily_limit' => 1, 'default_time' => '19:00', 'parent_prompt_label' => '食器を流しに運んだ', 'child_label' => '食器を流しに運んだ', 'quick_label' => '食器を運んだ'],
            ['phase' => 'evening', 'sort_order' => 7, 'name' => '明日の持ち物', 'icon' => '🎒', 'activity_key' => 'ACT-044', 'daily_limit' => 1, 'default_time' => null, 'parent_prompt_label' => '明日の持ち物を確認するように声をかけた', 'child_label' => '明日の持ち物を確認した', 'quick_label' => '明日の持ち物確認の声かけ'],
            ['phase' => 'night', 'sort_order' => 1, 'name' => '19時の振り返り', 'icon' => '🌟', 'activity_key' => 'ACT-027', 'daily_limit' => 1, 'default_time' => '19:00', 'parent_prompt_label' => '1日の振り返りに誘った', 'child_label' => 'ママと1日を振り返った', 'quick_label' => '振り返りの声かけ'],
            ['phase' => 'night', 'sort_order' => 2, 'name' => '明日の予定', 'icon' => '🗓️', 'activity_key' => 'ACT-035', 'daily_limit' => 1, 'default_time' => '19:15', 'parent_prompt_label' => '明日の時間割を確認するように声をかけた', 'child_label' => '明日の時間割を確認した', 'quick_label' => '時間割確認の声かけ'],
            ['phase' => 'night', 'sort_order' => 3, 'name' => '明日の準備', 'icon' => '🎒', 'activity_key' => 'ACT-022', 'daily_limit' => 1, 'default_time' => '19:30', 'parent_prompt_label' => '明日の持ち物を用意するように声をかけた', 'child_label' => '明日の持ち物を用意した', 'quick_label' => '持ち物準備の声かけ'],
            ['phase' => 'night', 'sort_order' => 4, 'name' => '入浴', 'icon' => '🛁', 'activity_key' => 'ACT-019', 'daily_limit' => 1, 'default_time' => '20:00', 'parent_prompt_label' => 'お風呂に入るように声をかけた', 'child_label' => 'お風呂に入った', 'quick_label' => '入浴の声かけ'],
            ['phase' => 'night', 'sort_order' => 5, 'name' => '歯磨き', 'icon' => '🪥', 'activity_key' => 'ACT-005', 'daily_limit' => 2, 'default_time' => '20:30', 'parent_prompt_label' => '歯をみがくように声をかけた', 'child_label' => '歯をみがいた', 'quick_label' => '歯みがきの声かけ'],
            ['phase' => 'night', 'sort_order' => 6, 'name' => '服薬', 'icon' => '💊', 'activity_key' => 'ACT-038', 'daily_limit' => 2, 'default_time' => '20:40', 'parent_prompt_label' => '夜の薬を飲むように声をかけた', 'child_label' => '薬を飲んだ', 'quick_label' => '服薬の声かけ'],
            ['phase' => 'night', 'sort_order' => 7, 'name' => 'スマホの区切り', 'icon' => '📱', 'activity_key' => 'ACT-020', 'daily_limit' => 1, 'default_time' => '20:45', 'parent_prompt_label' => '21時までにスマホ・ゲームを終えるように声をかけた', 'child_label' => '21時までにスマホ・ゲームを終えた', 'quick_label' => 'ゲーム終了の声かけ'],
            ['phase' => 'night', 'sort_order' => 8, 'name' => '就寝', 'icon' => '🛏️', 'activity_key' => 'ACT-025', 'daily_limit' => 1, 'default_time' => '21:30', 'parent_prompt_label' => '決めた時間に布団に入るように声をかけた', 'child_label' => '決めた時間に布団に入った', 'quick_label' => '就寝の声かけ'],
            ['phase' => 'night', 'sort_order' => 9, 'name' => 'おやすみ', 'icon' => '🌙', 'activity_key' => 'ACT-045', 'daily_limit' => 1, 'default_time' => '21:45', 'parent_prompt_label' => 'おやすみの挨拶をした', 'child_label' => 'おやすみを言った', 'quick_label' => 'おやすみの声かけ'],
        ];
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function promptTexts(): array
    {
        return [
            '起床' => [
                1 => 'おはよう。そろそろ起きる時間だよ',
                2 => '今から起きると、ゆっくり準備できそうだよ',
                3 => '今起きるか、あと5分で起きるか、決めよう',
            ],
            '朝食' => [
                1 => '朝ごはん、少し食べる？',
                2 => '出発まであと30分だよ。何なら食べられそう？',
                3 => '今日は一口だけでもOKにしようか',
            ],
            'morning::歯磨き' => [
                1 => '歯磨き、今する？ 5分後にする？',
                2 => '出発の前に歯磨きしておくと安心だよ',
                3 => '今日は、今するか帰ってからにするか決めよう',
            ],
            'night::歯磨き' => [
                1 => '歯磨き、今する？',
                2 => '寝る前に歯磨きを済ませておこうか',
                3 => '歯磨きだけしたら、あとは自由時間にしよう',
            ],
            'morning::服薬' => [
                1 => 'お薬の時間だよ',
                2 => 'ごはんのあと、お薬も一緒に済ませようか',
                3 => 'お薬だけは先に済ませておこうか',
            ],
            'night::服薬' => [
                1 => '夜のお薬の時間だよ',
                2 => '寝る前に、お薬を済ませておこうか',
                3 => 'お薬だけは先に済ませようか',
            ],
            '着替え' => [
                1 => '何時ごろ着替える？',
                2 => '出発まであと20分。そろそろ着替えようか',
                3 => '今着替えるか、5分後にするか決めよう',
            ],
            '日焼け止め' => [
                1 => '出る前に日焼け止めを塗ろうか',
                2 => '玄関に置いてあるよ。出る前にひと塗りしよう',
                3 => '今日は顔だけでもOKにしようか',
            ],
            '持ち物' => [
                1 => '持ち物、一緒に確認しようか',
                2 => '出発まであと10分。カバンの中を見ておこう',
                3 => '水筒だけ確認したら出発にしよう',
            ],
            '出発' => [
                1 => 'そろそろ出発する時間だよ',
                2 => '今出ると、いつもの時間に間に合いそうだよ',
                3 => '準備できたところまでで、出発しよう',
            ],
            '帰宅確認' => [
                1 => 'おかえり。まずは休む？',
                2 => 'おかえり。荷物を置いたら、ひと息つこう',
                3 => '今日は休んでからでOKだよ',
            ],
            '今日の予定' => [
                1 => '今日することを確認しようか',
                2 => '夕ごはんの前に、今日することを見ておこう',
                3 => '一つだけ選んで、あとは明日に回そうか',
            ],
            '宿題' => [
                1 => '宿題は何時ごろする？',
                2 => '夕ごはんまでにやると、あとがゆっくりできるよ',
                3 => '今日は、やる分だけ決めて区切ろう',
            ],
            '夕食' => [
                1 => 'ごはん、そろそろにする？',
                2 => 'あたたかいうちに食べようか',
                3 => '食べられる分だけでOKだよ',
            ],
            '入浴' => [
                1 => 'お風呂、今にする？ あとにする？',
                2 => '今入ると、寝る前にゆっくりできるよ',
                3 => '今日は短めでもいいから入っておこうか',
            ],
            '食器片づけ' => [
                1 => '食器、流しに運ぼうか',
                2 => '食べ終わったお皿から、流しに運んでみよう',
                3 => '今日は自分の分だけ運ぶのでOKだよ',
            ],
            '明日の持ち物' => [
                1 => '明日いる物を確認しようか',
                2 => '夕ごはんの前に、明日いる物だけ見ておこう',
                3 => '一番大事な物だけ、先にカバンに入れよう',
            ],
            '19時の振り返り' => [
                1 => '今日のことを一緒に確認しよう',
                2 => '19時になったら、今日の振り返りをしようか',
                3 => '今日は一つだけ、よかったことを教えて',
            ],
            '明日の予定' => [
                1 => '明日は何時間目から行く？',
                2 => '明日の時間割、一緒に見ておこうか',
                3 => '明日のことは、決められるところまででOKだよ',
            ],
            '明日の準備' => [
                1 => '明日使う物をカバンに入れようか',
                2 => '寝る前に準備しておくと、朝がラクだよ',
                3 => '一番大事な物だけ、今入れておこう',
            ],
            'スマホの区切り' => [
                1 => '今していること、どこで区切る？',
                2 => '21時まであと15分だよ。区切りを決めようか',
                3 => '今の動画が終わったら、おしまいにしよう',
            ],
            '就寝' => [
                1 => 'そろそろ寝る準備にしようか',
                2 => '決めた時間に布団に入ると、朝がラクだよ',
                3 => '電気を暗くするね。布団でゆっくりしよう',
            ],
            'おやすみ' => [
                1 => '今日の声かけはここまで。おやすみ',
                2 => '今日もおつかれさま。おやすみ',
                3 => 'また明日ね。おやすみ',
            ],
        ];
    }
}
