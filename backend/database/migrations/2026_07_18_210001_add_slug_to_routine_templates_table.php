<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Frozen slug map for the 22 seeded routine templates at Phase B expand time.
     * Do not delegate to application-layer classes that may change later.
     *
     * @var array<string, array<int, string>>
     */
    private const SLUGS_BY_PHASE_AND_SORT_ORDER = [
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

    public function up(): void
    {
        Schema::table('routine_templates', function (Blueprint $table) {
            $table->string('slug', 50)->nullable()->after('id');
        });

        $this->backfillSlugs();
        $this->assertNoDuplicateSlugs();
        $this->assertNoNulls('routine_templates', 'slug');

        Schema::table('routine_templates', function (Blueprint $table) {
            $table->unique('slug', 'routine_templates_slug_unique');
        });
    }

    public function down(): void
    {
        Schema::table('routine_templates', function (Blueprint $table) {
            $table->dropUnique('routine_templates_slug_unique');
            $table->dropColumn('slug');
        });
    }

    private function backfillSlugs(): void
    {
        $templates = DB::table('routine_templates')
            ->select('id', 'phase', 'sort_order', 'slug')
            ->orderBy('id')
            ->get();

        foreach ($templates as $template) {
            if ($template->slug !== null) {
                continue;
            }

            $slug = $this->slugFor($template->phase, (int) $template->sort_order);

            $updated = DB::table('routine_templates')
                ->where('id', $template->id)
                ->whereNull('slug')
                ->update(['slug' => $slug]);

            if ($updated !== 1) {
                throw new RuntimeException(
                    "Failed to backfill slug for routine_templates.id={$template->id}."
                );
            }
        }
    }

    private function slugFor(string $phase, int $sortOrder): string
    {
        $slug = self::SLUGS_BY_PHASE_AND_SORT_ORDER[$phase][$sortOrder] ?? null;

        if ($slug === null) {
            throw new RuntimeException(
                "No routine template slug defined for phase={$phase}, sort_order={$sortOrder}."
            );
        }

        return $slug;
    }

    private function assertNoDuplicateSlugs(): void
    {
        $duplicates = DB::table('routine_templates')
            ->select('slug', DB::raw('COUNT(*) as duplicate_count'))
            ->whereNotNull('slug')
            ->groupBy('slug')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $this->assertNoDuplicates('routine_templates.slug', $duplicates);
    }

    private function assertNoNulls(string $table, string $column): void
    {
        $count = DB::table($table)->whereNull($column)->count();

        if ($count > 0) {
            throw new RuntimeException(
                "{$table}.{$column}: found {$count} NULL value(s) after backfill."
            );
        }
    }

    /**
     * @param  Collection<int, object>  $duplicates
     */
    private function assertNoDuplicates(string $label, $duplicates): void
    {
        if ($duplicates->isNotEmpty()) {
            throw new RuntimeException(
                "{$label}: found {$duplicates->count()} duplicate group(s): ".$duplicates->toJson()
            );
        }
    }
};
