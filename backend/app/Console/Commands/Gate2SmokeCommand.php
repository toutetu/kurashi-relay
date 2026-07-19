<?php

namespace App\Console\Commands;

use App\Services\Gate2\Gate2MinimalSmokeRunner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class Gate2SmokeCommand extends Command
{
    protected $signature = 'gate2:smoke';

    protected $description = 'Run minimal API smoke checks against GATE2_SMOKE_DATABASE';

    public function handle(Gate2MinimalSmokeRunner $runner): int
    {
        $databasePath = env('GATE2_SMOKE_DATABASE');

        if (! is_string($databasePath) || $databasePath === '' || $databasePath === ':memory:') {
            $this->error('GATE2_SMOKE_DATABASE must be set to an on-disk SQLite file path.');

            return self::FAILURE;
        }

        $resolvedPath = realpath($databasePath);

        if ($resolvedPath === false || ! is_file($resolvedPath)) {
            $this->error('GATE2_SMOKE_DATABASE file not found: '.$databasePath);

            return self::FAILURE;
        }

        $familyToken = (string) env('FAMILY_TOKEN', '');

        if ($familyToken === '') {
            $this->error('FAMILY_TOKEN must be set for gate2:smoke.');

            return self::FAILURE;
        }

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => $resolvedPath,
            'cache.default' => 'array',
            'kurashi.family_token' => $familyToken,
        ]);
        DB::setDefaultConnection('sqlite');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $result = $runner->run($familyToken);

        foreach ($result->entries() as $entry) {
            $line = "[{$entry['status']}] {$entry['message']}";

            match ($entry['status']) {
                'FAIL' => $this->error($line),
                'SKIP' => $this->warn($line),
                default => $this->line($line),
            };
        }

        $this->newLine();
        $this->info(sprintf(
            'Gate 2 smoke summary: pass=%d fail=%d skip=%d database=%s',
            $result->passCount(),
            $result->failureCount(),
            $result->skipCount(),
            $resolvedPath,
        ));

        return $result->isSuccessful() ? self::SUCCESS : self::FAILURE;
    }
}
