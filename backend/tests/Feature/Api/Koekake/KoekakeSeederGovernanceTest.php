<?php

namespace Tests\Feature\Api\Koekake;

use App\Models\PromptTemplate;
use App\Models\RoutineTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KoekakeSeederGovernanceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var list<string>
     */
    private const FORBIDDEN_EXPRESSIONS = [
        '何回言ったら分かるの',
        'まだできていない',
        '約束を守って',
        'ママが困る',
        'ちゃんとしなさい',
        '明日行くって言ったでしょ',
        'できないと困るよ',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_seeded_texts_do_not_contain_forbidden_expressions(): void
    {
        $texts = PromptTemplate::query()->pluck('text')
            ->merge(RoutineTemplate::query()->pluck('parent_prompt_label'))
            ->filter();

        foreach ($texts as $text) {
            foreach (self::FORBIDDEN_EXPRESSIONS as $forbidden) {
                $this->assertStringNotContainsString(
                    $forbidden,
                    (string) $text,
                    "禁止表現「{$forbidden}」が文言に含まれています: {$text}"
                );
            }
        }
    }
}
