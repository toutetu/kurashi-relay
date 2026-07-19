<?php

namespace Database\Support;

use Illuminate\Support\Facades\DB;

final class MigrationConstraintHelper
{
    public static function setNotNull(string $table, string $column): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} SET NOT NULL");

            return;
        }

        if ($driver === 'sqlite') {
            self::addSqliteNotNullTriggers($table, $column);

            return;
        }
    }

    public static function setNullable(string $table, string $column): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} DROP NOT NULL");

            return;
        }

        if ($driver === 'sqlite') {
            self::dropSqliteNotNullTriggers($table, $column);

            return;
        }
    }

    public static function addCheck(string $table, string $constraintName, string $expression): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(
                "ALTER TABLE {$table} ADD CONSTRAINT {$constraintName} CHECK ({$expression})"
            );

            return;
        }

        if ($driver === 'sqlite') {
            // SQLite validates CHECK on new rows; table-level CHECK is applied on create only.
            // Tests rely on PostgreSQL for authoritative CHECK enforcement.
            return;
        }
    }

    public static function dropCheck(string $table, string $constraintName): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraintName}");
        }
    }

    public static function createPartialUniqueIndex(
        string $indexName,
        string $table,
        string $columns,
        string $whereClause,
    ): void {
        DB::statement(
            "CREATE UNIQUE INDEX {$indexName} ON {$table} ({$columns}) WHERE {$whereClause}"
        );
    }

    public static function createNullExcludingUniqueIndex(
        string $indexName,
        string $table,
        string $column,
    ): void {
        self::createPartialUniqueIndex(
            $indexName,
            $table,
            $column,
            "{$column} IS NOT NULL",
        );
    }

    public static function dropIndexIfExists(string $indexName): void
    {
        DB::statement("DROP INDEX IF EXISTS {$indexName}");
    }

    /**
     * PostgreSQL only: cancelled_at must not precede the parent activity_events.occurred_at.
     * SQLite lacks portable cross-table CHECK; use ActivityEventCancellationGuard in write paths.
     */
    public static function addActivityEventCancellationOccurrenceTrigger(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION activity_event_cancellations_occurred_at_guard()
RETURNS trigger AS $$
BEGIN
    IF NEW.cancelled_at < (
        SELECT occurred_at FROM activity_events WHERE id = NEW.activity_event_id
    ) THEN
        RAISE EXCEPTION 'cancelled_at must be greater than or equal to activity_events.occurred_at';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_event_cancellations_occurred_at_check
BEFORE INSERT OR UPDATE ON activity_event_cancellations
FOR EACH ROW
EXECUTE FUNCTION activity_event_cancellations_occurred_at_guard();
SQL);
    }

    public static function dropActivityEventCancellationOccurrenceTrigger(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
DROP TRIGGER IF EXISTS activity_event_cancellations_occurred_at_check ON activity_event_cancellations;
DROP FUNCTION IF EXISTS activity_event_cancellations_occurred_at_guard();
SQL);
    }

    public static function assertNoNulls(string $table, string $column): void
    {
        $count = DB::table($table)->whereNull($column)->count();

        if ($count > 0) {
            throw new \RuntimeException(
                "{$table}.{$column}: found {$count} NULL value(s) after backfill."
            );
        }
    }

    public static function resolveChildMemberId(): int
    {
        $ids = DB::table('family_members')
            ->where('role', 'child')
            ->pluck('id');

        if ($ids->count() !== 1) {
            throw new \RuntimeException(
                'Expected exactly one child family member, found '.$ids->count().'.'
            );
        }

        return (int) $ids->first();
    }

    private static function sqliteNotNullTriggerPrefix(string $table, string $column): string
    {
        return "{$table}_{$column}_not_null";
    }

    private static function addSqliteNotNullTriggers(string $table, string $column): void
    {
        $prefix = self::sqliteNotNullTriggerPrefix($table, $column);
        $message = "NOT NULL constraint failed: {$table}.{$column}";

        DB::unprepared(<<<SQL
CREATE TRIGGER {$prefix}_insert
BEFORE INSERT ON {$table}
FOR EACH ROW
WHEN NEW.{$column} IS NULL
BEGIN
    SELECT RAISE(ABORT, '{$message}');
END;

CREATE TRIGGER {$prefix}_update
BEFORE UPDATE ON {$table}
FOR EACH ROW
WHEN NEW.{$column} IS NULL
BEGIN
    SELECT RAISE(ABORT, '{$message}');
END;
SQL);
    }

    private static function dropSqliteNotNullTriggers(string $table, string $column): void
    {
        $prefix = self::sqliteNotNullTriggerPrefix($table, $column);

        DB::unprepared("DROP TRIGGER IF EXISTS {$prefix}_insert");
        DB::unprepared("DROP TRIGGER IF EXISTS {$prefix}_update");
    }
}
