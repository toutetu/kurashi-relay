<?php

namespace Database\Support;

final class ActivityDefinitionCatalog
{
    /**
     * @return list<array{
     *     activity_key: string,
     *     category: string,
     *     name: string,
     *     child_label: string,
     *     parent_prompt_label: string,
     *     quick_label: string,
     *     kind: string,
     *     sort_order: int
     * }>
     */
    public static function definitions(): array
    {
        return [
            ['activity_key' => 'ACT-001', 'category' => 'housework', 'name' => '名もなき家事', 'child_label' => '家事をした', 'parent_prompt_label' => '家事をした', 'quick_label' => '名もなき家事', 'kind' => 'activity', 'sort_order' => 1],
            ['activity_key' => 'ACT-002', 'category' => 'daily_living', 'name' => '脱いだ服を片付ける', 'child_label' => '脱いだ服をかごに入れた', 'parent_prompt_label' => '脱いだ服を片付けた', 'quick_label' => '服をかごに入れた', 'kind' => 'activity', 'sort_order' => 2],
            ['activity_key' => 'ACT-003', 'category' => 'daily_living', 'name' => '着替え', 'child_label' => '着替えた', 'parent_prompt_label' => '着替えるように声をかけた', 'quick_label' => '着替えの声かけ', 'kind' => 'activity', 'sort_order' => 3],
            ['activity_key' => 'ACT-004', 'category' => 'daily_living', 'name' => '食事', 'child_label' => 'ご飯を食べた', 'parent_prompt_label' => 'ご飯を食べるように声をかけた', 'quick_label' => '食事の声かけ', 'kind' => 'activity', 'sort_order' => 4],
            ['activity_key' => 'ACT-005', 'category' => 'daily_living', 'name' => '歯みがき', 'child_label' => '歯をみがいた', 'parent_prompt_label' => '歯をみがくように声をかけた', 'quick_label' => '歯みがきの声かけ', 'kind' => 'activity', 'sort_order' => 5],
            ['activity_key' => 'ACT-006', 'category' => 'daily_living', 'name' => '食器を運ぶ', 'child_label' => '食器を流しに運んだ', 'parent_prompt_label' => '食器を流しに運んだ', 'quick_label' => '食器を運んだ', 'kind' => 'activity', 'sort_order' => 6],
            ['activity_key' => 'ACT-007', 'category' => 'housework', 'name' => '食器洗い', 'child_label' => '食器を洗った', 'parent_prompt_label' => '食器を洗った', 'quick_label' => '食器を洗った', 'kind' => 'activity', 'sort_order' => 7],
            ['activity_key' => 'ACT-008', 'category' => 'housework', 'name' => '洗濯', 'child_label' => '洗濯をした', 'parent_prompt_label' => '洗濯を回して干した', 'quick_label' => '洗濯をした', 'kind' => 'activity', 'sort_order' => 8],
            ['activity_key' => 'ACT-009', 'category' => 'housework', 'name' => '掃除', 'child_label' => '掃除をした', 'parent_prompt_label' => '床に掃除機をかけた', 'quick_label' => '掃除をした', 'kind' => 'activity', 'sort_order' => 9],
            ['activity_key' => 'ACT-010', 'category' => 'housework', 'name' => '夕飯づくり', 'child_label' => '夕飯を作った', 'parent_prompt_label' => '夕飯を作った', 'quick_label' => '夕飯を作った', 'kind' => 'activity', 'sort_order' => 10],
            ['activity_key' => 'ACT-015', 'category' => 'learning', 'name' => '宿題', 'child_label' => '宿題をした', 'parent_prompt_label' => '宿題をするように声をかけた', 'quick_label' => '宿題実施の声かけ', 'kind' => 'activity', 'sort_order' => 15],
            ['activity_key' => 'ACT-019', 'category' => 'daily_living', 'name' => '入浴', 'child_label' => 'お風呂に入った', 'parent_prompt_label' => 'お風呂に入るように声をかけた', 'quick_label' => '入浴の声かけ', 'kind' => 'activity', 'sort_order' => 19],
            ['activity_key' => 'ACT-020', 'category' => 'daily_living', 'name' => 'スマホの区切り', 'child_label' => '21時までにスマホ・ゲームを終えた', 'parent_prompt_label' => '21時までにスマホ・ゲームを終えるように声をかけた', 'quick_label' => 'ゲーム終了の声かけ', 'kind' => 'activity', 'sort_order' => 20],
            ['activity_key' => 'ACT-021', 'category' => 'daily_living', 'name' => 'カバンを片付ける', 'child_label' => 'カバンを棚に置いた', 'parent_prompt_label' => 'カバンを片付けた', 'quick_label' => 'カバンを片付けた', 'kind' => 'activity', 'sort_order' => 21],
            ['activity_key' => 'ACT-022', 'category' => 'daily_living', 'name' => '明日の準備', 'child_label' => '明日の持ち物を用意した', 'parent_prompt_label' => '明日の持ち物を用意するように声をかけた', 'quick_label' => '持ち物準備の声かけ', 'kind' => 'activity', 'sort_order' => 22],
            ['activity_key' => 'ACT-025', 'category' => 'sleep', 'name' => '就寝', 'child_label' => '決めた時間に布団に入った', 'parent_prompt_label' => '決めた時間に布団に入るように声をかけた', 'quick_label' => '就寝の声かけ', 'kind' => 'sleep', 'sort_order' => 25],
            ['activity_key' => 'ACT-027', 'category' => 'reflection', 'name' => '1日の振り返り', 'child_label' => 'ママと1日を振り返った', 'parent_prompt_label' => '1日の振り返りに誘った', 'quick_label' => '振り返りの声かけ', 'kind' => 'activity', 'sort_order' => 27],
            ['activity_key' => 'ACT-028', 'category' => 'daily_living', 'name' => '水筒を出す', 'child_label' => '水筒を流しに出した', 'parent_prompt_label' => '水筒を流しに出した', 'quick_label' => '水筒を出した', 'kind' => 'activity', 'sort_order' => 28],
            ['activity_key' => 'ACT-035', 'category' => 'planning', 'name' => '時間割確認', 'child_label' => '明日の時間割を確認した', 'parent_prompt_label' => '明日の時間割を確認するように声をかけた', 'quick_label' => '時間割確認の声かけ', 'kind' => 'activity', 'sort_order' => 35],
            ['activity_key' => 'ACT-037', 'category' => 'sleep', 'name' => '起床', 'child_label' => '自分で起きた', 'parent_prompt_label' => '起きるように声をかけた', 'quick_label' => '起床の声かけ', 'kind' => 'activity', 'sort_order' => 37],
            ['activity_key' => 'ACT-038', 'category' => 'daily_living', 'name' => '服薬', 'child_label' => '薬を飲んだ', 'parent_prompt_label' => '薬を飲むように声をかけた', 'quick_label' => '服薬の声かけ', 'kind' => 'activity', 'sort_order' => 38],
            ['activity_key' => 'ACT-039', 'category' => 'daily_living', 'name' => '日焼け止め', 'child_label' => '日焼け止めを塗った', 'parent_prompt_label' => '日焼け止めを塗るように声をかけた', 'quick_label' => '日焼け止めの声かけ', 'kind' => 'activity', 'sort_order' => 39],
            ['activity_key' => 'ACT-040', 'category' => 'daily_living', 'name' => '今日の持ち物確認', 'child_label' => '今日の持ち物を確認した', 'parent_prompt_label' => '持ち物を確認するように声をかけた', 'quick_label' => '今日の持ち物確認の声かけ', 'kind' => 'activity', 'sort_order' => 40],
            ['activity_key' => 'ACT-041', 'category' => 'daily_living', 'name' => '出発', 'child_label' => '時間までに出発できた', 'parent_prompt_label' => '出発するように声をかけた', 'quick_label' => '出発の声かけ', 'kind' => 'activity', 'sort_order' => 41],
            ['activity_key' => 'ACT-042', 'category' => 'recovery', 'name' => '帰宅後のひと息', 'child_label' => '帰ってきてひと息ついた', 'parent_prompt_label' => '帰宅後にひと息つくよう声をかけた', 'quick_label' => '帰宅後の声かけ', 'kind' => 'recovery', 'sort_order' => 42],
            ['activity_key' => 'ACT-043', 'category' => 'planning', 'name' => '今日の予定確認', 'child_label' => '今日することを確認した', 'parent_prompt_label' => '今日することを確認するように声をかけた', 'quick_label' => '予定確認の声かけ', 'kind' => 'activity', 'sort_order' => 43],
            ['activity_key' => 'ACT-044', 'category' => 'planning', 'name' => '明日の持ち物確認', 'child_label' => '明日の持ち物を確認した', 'parent_prompt_label' => '明日の持ち物を確認するように声をかけた', 'quick_label' => '明日の持ち物確認の声かけ', 'kind' => 'activity', 'sort_order' => 44],
            ['activity_key' => 'ACT-045', 'category' => 'sleep', 'name' => 'おやすみ', 'child_label' => 'おやすみを言った', 'parent_prompt_label' => 'おやすみの挨拶をした', 'quick_label' => 'おやすみの声かけ', 'kind' => 'sleep', 'sort_order' => 45],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function taskDefinitionActivityKeys(): array
    {
        return [
            'child:kigae' => 'ACT-003',
            'child:fuku' => 'ACT-002',
            'child:shokki' => 'ACT-006',
            'child:kaban' => 'ACT-021',
            'child:suito' => 'ACT-028',
            'mother:shokki' => 'ACT-007',
            'mother:sentaku' => 'ACT-008',
            'mother:nanashi' => 'ACT-001',
            'mother:soji' => 'ACT-009',
            'mother:yuhan' => 'ACT-010',
        ];
    }

    public static function taskDefinitionActivityKey(string $ownerRole, string $slug): ?string
    {
        return self::taskDefinitionActivityKeys()["{$ownerRole}:{$slug}"] ?? null;
    }

    /**
     * @return list<string>
     */
    public static function reviewRequiredTaskKeys(): array
    {
        return [];
    }
}
