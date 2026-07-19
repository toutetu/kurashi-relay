<?php

namespace Database\Support;

final class RoutineTemplateSlugCatalog
{
    /**
     * Frozen slug map for the 22 seeded routine templates.
     *
     * @var array<string, array<int, string>>
     */
    public const SLUGS_BY_PHASE_AND_SORT_ORDER = [
        'morning' => [
            1 => 'morning-wake-up',
            2 => 'morning-breakfast',
            3 => 'morning-teeth-brushing',
            4 => 'morning-medication',
            5 => 'morning-changing-clothes',
            6 => 'morning-sunscreen',
            7 => 'morning-belongings-check',
            8 => 'morning-departure',
        ],
        'evening' => [
            1 => 'evening-home-return',
            2 => 'evening-today-schedule',
            3 => 'evening-homework',
            4 => 'evening-dinner',
            5 => 'evening-bath',
            6 => 'evening-tomorrow-belongings',
        ],
        'night' => [
            1 => 'night-reflection',
            2 => 'night-tomorrow-schedule',
            3 => 'night-tomorrow-preparation',
            4 => 'night-teeth-brushing',
            5 => 'night-medication',
            6 => 'night-screen-cutoff',
            7 => 'night-bedtime',
            8 => 'night-goodnight',
        ],
    ];

    public static function slugFor(string $phase, int $sortOrder): string
    {
        $slug = self::SLUGS_BY_PHASE_AND_SORT_ORDER[$phase][$sortOrder] ?? null;

        if ($slug === null) {
            throw new \RuntimeException(
                "No routine template slug defined for phase={$phase}, sort_order={$sortOrder}."
            );
        }

        return $slug;
    }
}
