<?php

namespace Tests\Feature\Console;

use Tests\TestCase;

class Gate2SmokeCommandTest extends TestCase
{
    public function test_gate2_smoke_command_passes_against_explicit_database_file(): void
    {
        $backendRoot = dirname(__DIR__, 3);
        $phpBinary = PHP_BINARY;
        $databasePath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-smoke-command-'.uniqid('', true).'.sqlite';

        $this->seedDatabaseFile($backendRoot, $databasePath, $phpBinary);

        putenv('GATE2_SMOKE_DATABASE='.$databasePath);
        putenv('FAMILY_TOKEN=test-family-token');

        try {
            $descriptorSpec = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];

            $process = proc_open(
                escapeshellarg($phpBinary).' artisan gate2:smoke',
                $descriptorSpec,
                $pipes,
                $backendRoot,
                [
                    'GATE2_SMOKE_DATABASE' => $databasePath,
                    'FAMILY_TOKEN' => 'test-family-token',
                    'APP_ENV' => 'local',
                    'DB_CONNECTION' => 'sqlite',
                    'DB_DATABASE' => $databasePath,
                    'CACHE_STORE' => 'array',
                ],
            );

            $this->assertIsResource($process);

            fclose($pipes[0]);
            $output = stream_get_contents($pipes[1]);
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $exitCode = proc_close($process);

            $combinedOutput = trim($output.PHP_EOL.$errors);

            $this->assertSame(0, $exitCode, $combinedOutput);
            $this->assertStringContainsString('Gate 2 smoke summary: pass=', $combinedOutput);
            $this->assertStringContainsString('fail=0', $combinedOutput);
            $this->assertStringContainsString($databasePath, $combinedOutput);
        } finally {
            putenv('GATE2_SMOKE_DATABASE');
            putenv('FAMILY_TOKEN');

            if (is_file($databasePath)) {
                unlink($databasePath);
            }
        }
    }

    public function test_gate2_smoke_command_uses_sqlite_even_when_default_connection_is_not_sqlite(): void
    {
        $backendRoot = dirname(__DIR__, 3);
        $phpBinary = PHP_BINARY;
        $databasePath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-smoke-non-sqlite-default-'.uniqid('', true).'.sqlite';

        $this->seedDatabaseFile($backendRoot, $databasePath, $phpBinary);

        try {
            $descriptorSpec = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];

            $process = proc_open(
                escapeshellarg($phpBinary).' artisan gate2:smoke',
                $descriptorSpec,
                $pipes,
                $backendRoot,
                [
                    'GATE2_SMOKE_DATABASE' => $databasePath,
                    'FAMILY_TOKEN' => 'test-family-token',
                    'APP_ENV' => 'local',
                    'DB_CONNECTION' => 'pgsql',
                    'DB_DATABASE' => 'gate2_smoke_should_not_use_this',
                    'CACHE_STORE' => 'array',
                ],
            );

            $this->assertIsResource($process);

            fclose($pipes[0]);
            $output = stream_get_contents($pipes[1]);
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $exitCode = proc_close($process);

            $combinedOutput = trim($output.PHP_EOL.$errors);

            $this->assertSame(0, $exitCode, $combinedOutput);
            $this->assertStringContainsString('fail=0', $combinedOutput);
            $this->assertStringContainsString($databasePath, $combinedOutput);
        } finally {
            if (is_file($databasePath)) {
                unlink($databasePath);
            }
        }
    }

    public function test_gate2_smoke_command_rejects_memory_database(): void
    {
        $backendRoot = dirname(__DIR__, 3);
        $phpBinary = PHP_BINARY;

        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open(
            escapeshellarg($phpBinary).' artisan gate2:smoke',
            $descriptorSpec,
            $pipes,
            $backendRoot,
            [
                'GATE2_SMOKE_DATABASE' => ':memory:',
                'FAMILY_TOKEN' => 'test-family-token',
                'APP_ENV' => 'local',
                'DB_CONNECTION' => 'sqlite',
                'DB_DATABASE' => ':memory:',
            ],
        );

        $this->assertIsResource($process);

        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        $errors = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        $combinedOutput = trim($output.PHP_EOL.$errors);

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString(
            'GATE2_SMOKE_DATABASE must be set to an on-disk SQLite file path.',
            $combinedOutput,
        );
    }

    private function seedDatabaseFile(string $backendRoot, string $databasePath, string $phpBinary): void
    {
        $escapedPath = str_replace("'", "''", $databasePath);
        $escapedPhp = str_replace("'", "''", $phpBinary);
        $command = sprintf(
            'powershell -NoProfile -Command "$env:DB_CONNECTION=\'sqlite\'; $env:DB_DATABASE=\'%s\'; $env:APP_ENV=\'local\'; Set-Location -LiteralPath %s; & \'%s\' artisan migrate:fresh --seed --force"',
            $escapedPath,
            escapeshellarg($backendRoot),
            $escapedPhp,
        );

        exec($command, $output, $exitCode);

        $this->assertSame(0, $exitCode, implode(PHP_EOL, $output));
        $this->assertFileExists($databasePath);
    }
}
