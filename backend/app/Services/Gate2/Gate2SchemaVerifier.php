<?php

namespace App\Services\Gate2;

use Database\Support\ActivityDefinitionCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class Gate2SchemaVerifier
{
    /** @var list<string> */
    private const PHASE_CDE_TABLES = [
        'activity_definitions',
        'activity_events',
        'activity_event_participants',
        'activity_event_outcomes',
        'activity_event_cancellations',
        'planned_activities',
        'plan_actual_links',
        'reward_rules',
        'reward_transactions',
        'plan_questions',
        'plan_answer_versions',
    ];

    /** @var array<string, list<string>> */
    private const REQUIRED_COLUMNS = [
        'activity_definitions' => [
            'activity_key', 'category', 'name', 'child_label', 'parent_prompt_label',
            'quick_label', 'kind', 'is_active', 'sort_order',
        ],
        'activity_events' => [
            'activity_definition_id', 'event_type', 'occurred_at', 'recorded_by_member_id',
            'source', 'idempotency_key',
        ],
        'activity_event_participants' => [
            'activity_event_id', 'family_member_id', 'role',
        ],
        'activity_event_outcomes' => ['activity_event_id', 'result'],
        'activity_event_cancellations' => [
            'activity_event_id', 'cancelled_at', 'cancelled_by_member_id',
        ],
        'planned_activities' => [
            'subject_member_id', 'source_type', 'source_key', 'title_snapshot',
            'local_date', 'status', 'plan_answer_version_id',
        ],
        'plan_actual_links' => [
            'planned_activity_id', 'activity_event_id', 'link_type', 'matched_by', 'confidence',
        ],
        'reward_rules' => ['member_id', 'reward_kind', 'amount', 'is_active'],
        'reward_transactions' => [
            'member_id', 'transaction_type', 'kind', 'amount', 'occurred_at', 'idempotency_key',
        ],
        'plan_questions' => ['question_key', 'label', 'answer_type', 'sort_order', 'is_active'],
        'plan_answer_versions' => [
            'daily_plan_id', 'question_id', 'version_no', 'value_json', 'recorded_at',
        ],
        'task_definitions' => ['activity_definition_id'],
        'routine_templates' => ['activity_definition_id', 'slug', 'subject_member_id'],
        'prompt_events' => ['activity_event_id', 'prompt_order', 'prompt_level'],
        'daily_tasks' => ['subject_member_id', 'planned_activity_id'],
    ];

    /** @var list<array{table: string, column: string, references: string}> */
    private const REQUIRED_FOREIGN_KEYS = [
        ['table' => 'task_definitions', 'column' => 'activity_definition_id', 'references' => 'activity_definitions'],
        ['table' => 'routine_templates', 'column' => 'activity_definition_id', 'references' => 'activity_definitions'],
        ['table' => 'routine_templates', 'column' => 'subject_member_id', 'references' => 'family_members'],
        ['table' => 'activity_events', 'column' => 'activity_definition_id', 'references' => 'activity_definitions'],
        ['table' => 'activity_events', 'column' => 'recorded_by_member_id', 'references' => 'family_members'],
        ['table' => 'activity_event_participants', 'column' => 'activity_event_id', 'references' => 'activity_events'],
        ['table' => 'activity_event_participants', 'column' => 'family_member_id', 'references' => 'family_members'],
        ['table' => 'activity_event_outcomes', 'column' => 'activity_event_id', 'references' => 'activity_events'],
        ['table' => 'activity_event_cancellations', 'column' => 'activity_event_id', 'references' => 'activity_events'],
        ['table' => 'activity_event_cancellations', 'column' => 'cancelled_by_member_id', 'references' => 'family_members'],
        ['table' => 'planned_activities', 'column' => 'subject_member_id', 'references' => 'family_members'],
        ['table' => 'planned_activities', 'column' => 'activity_definition_id', 'references' => 'activity_definitions'],
        ['table' => 'planned_activities', 'column' => 'routine_template_id', 'references' => 'routine_templates'],
        ['table' => 'planned_activities', 'column' => 'plan_answer_version_id', 'references' => 'plan_answer_versions'],
        ['table' => 'plan_actual_links', 'column' => 'planned_activity_id', 'references' => 'planned_activities'],
        ['table' => 'plan_actual_links', 'column' => 'activity_event_id', 'references' => 'activity_events'],
        ['table' => 'reward_rules', 'column' => 'activity_definition_id', 'references' => 'activity_definitions'],
        ['table' => 'reward_rules', 'column' => 'member_id', 'references' => 'family_members'],
        ['table' => 'reward_transactions', 'column' => 'member_id', 'references' => 'family_members'],
        ['table' => 'reward_transactions', 'column' => 'activity_event_id', 'references' => 'activity_events'],
        ['table' => 'reward_transactions', 'column' => 'reward_rule_id', 'references' => 'reward_rules'],
        ['table' => 'reward_transactions', 'column' => 'reverses_transaction_id', 'references' => 'reward_transactions'],
        ['table' => 'prompt_events', 'column' => 'activity_event_id', 'references' => 'activity_events'],
        ['table' => 'daily_tasks', 'column' => 'planned_activity_id', 'references' => 'planned_activities'],
        ['table' => 'plan_answer_versions', 'column' => 'daily_plan_id', 'references' => 'daily_plans'],
        ['table' => 'plan_answer_versions', 'column' => 'question_id', 'references' => 'plan_questions'],
        ['table' => 'plan_answer_versions', 'column' => 'decided_with_member_id', 'references' => 'family_members'],
        ['table' => 'plan_answer_versions', 'column' => 'recorded_by_member_id', 'references' => 'family_members'],
        ['table' => 'plan_answer_versions', 'column' => 'supersedes_version_id', 'references' => 'plan_answer_versions'],
        ['table' => 'plan_questions', 'column' => 'activity_definition_id', 'references' => 'activity_definitions'],
    ];

    /** @var list<string> */
    private const REQUIRED_INDEXES = [
        'activity_events_idempotency_key_unique',
        'activity_event_participants_event_member_role_unique',
        'planned_activities_source_unique',
        'plan_actual_links_unique',
        'reward_transactions_idempotency_key_unique',
        'plan_questions_question_key_unique',
        'plan_answer_versions_plan_question_version_unique',
        'activity_definitions_activity_key_unique',
    ];

    /** @var list<string> */
    private const POSTGRESQL_ONLY_CHECKS = [
        'activity_events_event_type_check',
        'activity_events_source_check',
        'activity_event_participants_role_check',
        'activity_event_outcomes_result_check',
        'planned_activities_source_type_check',
        'planned_activities_status_check',
        'planned_activities_time_order_check',
        'plan_actual_links_link_type_check',
        'plan_actual_links_matched_by_check',
        'plan_actual_links_confidence_check',
        'reward_transactions_transaction_type_check',
        'reward_transactions_kind_check',
        'reward_transactions_amount_check',
        'reward_rules_reward_kind_check',
        'activity_definitions_kind_check',
        'activity_definitions_sort_order_check',
        'plan_questions_answer_type_check',
        'plan_questions_sort_order_check',
        'plan_answer_versions_version_no_check',
        'prompt_events_prompt_order_check',
        'prompt_events_prompt_level_check',
        'routine_templates_daily_limit_check',
        'routine_templates_sort_order_check',
    ];

    /** @var list<string> */
    private const POSTGRESQL_ONLY_PARTIAL_INDEXES = [
        'activity_events_prompt_time',
        'prompt_events_activity_event_id_unique',
        'plan_actual_links_event_type',
        'reward_transactions_event_rule_type_unique',
        'reminder_schedules_one_scheduled_per_task_unique',
        'reward_collections_task_record_id_unique',
    ];

    private const POSTGRESQL_ONLY_TRIGGER = 'activity_event_cancellations_occurred_at_check';

    public function verify(): Gate2VerificationResult
    {
        $result = new Gate2VerificationResult;
        $driver = DB::getDriverName();

        $result->pass("driver={$driver}");

        $this->verifyTables($result);
        $this->verifyColumns($result);
        $this->verifyForeignKeys($result, $driver);
        $this->verifyIndexes($result, $driver);
        $this->verifySeedCounts($result);
        $this->verifyNullViolations($result);
        $this->verifyUnlinkedMasters($result);
        $this->verifyDuplicates($result);
        $this->verifyPostgresqlOnlyArtifacts($result, $driver);

        return $result;
    }

    private function verifyTables(Gate2VerificationResult $result): void
    {
        foreach (self::PHASE_CDE_TABLES as $table) {
            if (Schema::hasTable($table)) {
                $result->pass("table exists: {$table}");
            } else {
                $result->fail("missing table: {$table}");
            }
        }
    }

    private function verifyColumns(Gate2VerificationResult $result): void
    {
        foreach (self::REQUIRED_COLUMNS as $table => $columns) {
            if (! Schema::hasTable($table)) {
                $result->fail("cannot verify columns; missing table: {$table}");

                continue;
            }

            foreach ($columns as $column) {
                if (Schema::hasColumn($table, $column)) {
                    $result->pass("column exists: {$table}.{$column}");
                } else {
                    $result->fail("missing column: {$table}.{$column}");
                }
            }
        }
    }

    private function verifyForeignKeys(Gate2VerificationResult $result, string $driver): void
    {
        $existing = $this->foreignKeyMap($driver);

        foreach (self::REQUIRED_FOREIGN_KEYS as $foreignKey) {
            $key = "{$foreignKey['table']}.{$foreignKey['column']}->{$foreignKey['references']}";

            if (isset($existing[$key])) {
                $result->pass("foreign key exists: {$key}");
            } else {
                $result->fail("missing foreign key: {$key}");
            }
        }
    }

    private function verifyIndexes(Gate2VerificationResult $result, string $driver): void
    {
        $indexes = $this->indexNames($driver);

        foreach (self::REQUIRED_INDEXES as $indexName) {
            if (in_array($indexName, $indexes, true)) {
                $result->pass("index exists: {$indexName}");
            } else {
                $result->fail("missing index: {$indexName}");
            }
        }
    }

    private function verifySeedCounts(Gate2VerificationResult $result): void
    {
        $expected = [
            'activity_definitions' => count(ActivityDefinitionCatalog::definitions()),
            'routine_templates' => 24,
            'task_definitions' => 10,
            'plan_questions' => 6,
            'reward_rules' => 5,
            'family_members' => 2,
        ];

        foreach ($expected as $table => $count) {
            if (! Schema::hasTable($table)) {
                $result->fail("cannot verify seed count; missing table: {$table}");

                continue;
            }

            $actual = DB::table($table)->count();

            if ($actual === $count) {
                $result->pass("seed count: {$table}={$count}");
            } else {
                $result->fail("seed count mismatch: {$table} expected {$count}, got {$actual}");
            }
        }
    }

    private function verifyNullViolations(Gate2VerificationResult $result): void
    {
        $checks = [
            ['table' => 'daily_plans', 'column' => 'subject_member_id'],
            ['table' => 'daily_tasks', 'column' => 'subject_member_id'],
            ['table' => 'routine_templates', 'column' => 'slug'],
            ['table' => 'routine_templates', 'column' => 'subject_member_id'],
        ];

        foreach ($checks as $check) {
            if (! Schema::hasTable($check['table']) || ! Schema::hasColumn($check['table'], $check['column'])) {
                $result->fail("cannot verify NULLs; missing {$check['table']}.{$check['column']}");

                continue;
            }

            $count = DB::table($check['table'])->whereNull($check['column'])->count();

            if ($count === 0) {
                $result->pass("no NULLs: {$check['table']}.{$check['column']}");
            } else {
                $result->fail("NULL violation: {$check['table']}.{$check['column']} has {$count} row(s)");
            }
        }
    }

    private function verifyUnlinkedMasters(Gate2VerificationResult $result): void
    {
        if (! Schema::hasTable('task_definitions')) {
            $result->fail('cannot verify unlinked masters; missing task_definitions');

            return;
        }

        $unlinkedTasks = DB::table('task_definitions')
            ->where('is_active', true)
            ->whereNull('activity_definition_id')
            ->count();

        if ($unlinkedTasks === 0) {
            $result->pass('active task_definitions are linked to activity_definitions');
        } else {
            $result->fail("unlinked active task_definitions: {$unlinkedTasks}");
        }

        if (! Schema::hasTable('routine_templates')) {
            $result->fail('cannot verify unlinked masters; missing routine_templates');

            return;
        }

        $unlinkedRoutines = DB::table('routine_templates')
            ->where('is_active', true)
            ->whereNull('activity_definition_id')
            ->count();

        if ($unlinkedRoutines === 0) {
            $result->pass('active routine_templates are linked to activity_definitions');
        } else {
            $result->fail("unlinked active routine_templates: {$unlinkedRoutines}");
        }

        $reviewRequired = ActivityDefinitionCatalog::reviewRequiredTaskKeys();

        if ($reviewRequired === []) {
            $result->pass('review-required activity mappings: 0');
        } else {
            $result->fail('review-required activity mappings: '.count($reviewRequired));
        }
    }

    private function verifyDuplicates(Gate2VerificationResult $result): void
    {
        $uniqueColumns = [
            ['table' => 'activity_definitions', 'column' => 'activity_key'],
            ['table' => 'routine_templates', 'column' => 'slug'],
            ['table' => 'plan_questions', 'column' => 'question_key'],
            ['table' => 'activity_events', 'column' => 'idempotency_key'],
            ['table' => 'reward_transactions', 'column' => 'idempotency_key'],
        ];

        foreach ($uniqueColumns as $check) {
            if (! Schema::hasTable($check['table']) || ! Schema::hasColumn($check['table'], $check['column'])) {
                $result->fail("cannot verify duplicates; missing {$check['table']}.{$check['column']}");

                continue;
            }

            $duplicateCount = DB::table($check['table'])
                ->select($check['column'])
                ->whereNotNull($check['column'])
                ->groupBy($check['column'])
                ->havingRaw('COUNT(*) > 1')
                ->get()
                ->count();

            if ($duplicateCount === 0) {
                $result->pass("no duplicates: {$check['table']}.{$check['column']}");
            } else {
                $result->fail("duplicate values: {$check['table']}.{$check['column']} ({$duplicateCount} group(s))");
            }
        }
    }

    private function verifyPostgresqlOnlyArtifacts(Gate2VerificationResult $result, string $driver): void
    {
        if ($driver !== 'pgsql') {
            foreach (self::POSTGRESQL_ONLY_CHECKS as $checkName) {
                $result->skip("postgresql check: {$checkName}");
            }

            foreach (self::POSTGRESQL_ONLY_PARTIAL_INDEXES as $indexName) {
                $result->skip("postgresql partial index: {$indexName}");
            }

            $result->skip('postgresql trigger: '.self::POSTGRESQL_ONLY_TRIGGER);

            return;
        }

        $checks = collect(DB::select(
            "SELECT conname FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace"
        ))->pluck('conname')->all();

        foreach (self::POSTGRESQL_ONLY_CHECKS as $checkName) {
            if (in_array($checkName, $checks, true)) {
                $result->pass("postgresql check: {$checkName}");
            } else {
                $result->fail("missing postgresql check: {$checkName}");
            }
        }

        $indexes = $this->indexNames($driver);

        foreach (self::POSTGRESQL_ONLY_PARTIAL_INDEXES as $indexName) {
            if (in_array($indexName, $indexes, true)) {
                $result->pass("postgresql partial index: {$indexName}");
            } else {
                $result->fail("missing postgresql partial index: {$indexName}");
            }
        }

        $triggerExists = DB::selectOne(
            'SELECT 1 FROM pg_trigger WHERE tgname = ?',
            [self::POSTGRESQL_ONLY_TRIGGER],
        ) !== null;

        if ($triggerExists) {
            $result->pass('postgresql trigger: '.self::POSTGRESQL_ONLY_TRIGGER);
        } else {
            $result->fail('missing postgresql trigger: '.self::POSTGRESQL_ONLY_TRIGGER);
        }
    }

    /**
     * @return list<string>
     */
    private function sqliteTableNames(): array
    {
        return collect(DB::select(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ))->pluck('name')->all();
    }

    /**
     * @return array<string, true>
     */
    private function foreignKeyMap(string $driver): array
    {
        $map = [];

        if ($driver === 'sqlite') {
            foreach ($this->sqliteTableNames() as $table) {
                $rows = DB::select("PRAGMA foreign_key_list('{$table}')");

                foreach ($rows as $row) {
                    $key = "{$table}.{$row->from}->{$row->table}";
                    $map[$key] = true;
                }
            }

            return $map;
        }

        if ($driver === 'pgsql') {
            $rows = DB::select(<<<'SQL'
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
SQL);

            foreach ($rows as $row) {
                $key = "{$row->source_table}.{$row->source_column}->{$row->target_table}";
                $map[$key] = true;
            }
        }

        return $map;
    }

    /**
     * @return list<string>
     */
    private function indexNames(string $driver): array
    {
        if ($driver === 'sqlite') {
            $names = [];

            foreach ($this->sqliteTableNames() as $table) {
                $rows = DB::select("PRAGMA index_list('{$table}')");

                foreach ($rows as $row) {
                    $names[] = $row->name;
                }
            }

            return $names;
        }

        if ($driver === 'pgsql') {
            return collect(DB::select(
                "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
            ))->pluck('indexname')->all();
        }

        return [];
    }
}
