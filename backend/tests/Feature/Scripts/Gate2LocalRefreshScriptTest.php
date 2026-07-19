<?php

namespace Tests\Feature\Scripts;

use Tests\TestCase;

class Gate2LocalRefreshScriptTest extends TestCase
{
    public function test_gate2_local_refresh_script_runs_against_temp_sqlite_and_writes_evidence(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $backendRoot = $repoRoot.DIRECTORY_SEPARATOR.'backend';
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-refresh-test-'.uniqid('', true);
        $databasePath = $tempDir.DIRECTORY_SEPARATOR.'gate2-verify.sqlite';
        $evidenceDir = $tempDir.DIRECTORY_SEPARATOR.'evidence';

        mkdir($tempDir, 0777, true);

        try {
            $this->seedTempDatabase($backendRoot, $databasePath);

            $command = sprintf(
                'powershell -NoProfile -ExecutionPolicy Bypass -File %s -DatabasePath %s -EvidenceDir %s',
                escapeshellarg($scriptPath),
                escapeshellarg($databasePath),
                escapeshellarg($evidenceDir),
            );

            exec($command, $output, $exitCode);

            $this->assertSame(0, $exitCode, implode(PHP_EOL, $output));
            $this->assertFileExists($evidenceDir.DIRECTORY_SEPARATOR.'manifest.txt');
            $this->assertFileExists($evidenceDir.DIRECTORY_SEPARATOR.'run.log');
            $this->assertFileExists($evidenceDir.DIRECTORY_SEPARATOR.'pre-refresh.sqlite');

            $manifest = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'manifest.txt');
            $this->assertIsString($manifest);
            $this->assertStringContainsString('target_database=', $manifest);
            $this->assertStringContainsString('restore_rehearsal=pass', $manifest);
            $this->assertStringContainsString('terminal_state=restored-pre-refresh', $manifest);

            $log = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'run.log');
            $this->assertIsString($log);
            $this->assertStringContainsString('gate2:verify', $log);
            $this->assertStringContainsString('gate2:smoke', $log);
            $this->assertStringContainsString('terminal_state=restored-pre-refresh', $log);
            $this->assertStringContainsString('Gate 2 local refresh completed successfully', $log);
        } finally {
            $this->removeDirectory($tempDir);
        }
    }

    public function test_gate2_local_refresh_script_can_keep_refreshed_database(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $backendRoot = $repoRoot.DIRECTORY_SEPARATOR.'backend';
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-refresh-keep-test-'.uniqid('', true);
        $databasePath = $tempDir.DIRECTORY_SEPARATOR.'gate2-verify.sqlite';
        $evidenceDir = $tempDir.DIRECTORY_SEPARATOR.'evidence';

        mkdir($tempDir, 0777, true);

        try {
            $this->seedTempDatabase($backendRoot, $databasePath);
            $preRefreshHash = hash_file('sha256', $databasePath);

            $command = sprintf(
                'powershell -NoProfile -ExecutionPolicy Bypass -File %s -DatabasePath %s -EvidenceDir %s -KeepRefreshedDatabase',
                escapeshellarg($scriptPath),
                escapeshellarg($databasePath),
                escapeshellarg($evidenceDir),
            );

            exec($command, $output, $exitCode);

            $this->assertSame(0, $exitCode, implode(PHP_EOL, $output));

            $manifest = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'manifest.txt');
            $this->assertIsString($manifest);
            $this->assertStringContainsString('terminal_state=refreshed-kept', $manifest);
            $this->assertStringContainsString('restore_rehearsal=skipped_keep_refreshed', $manifest);
            $this->assertNotSame($preRefreshHash, hash_file('sha256', $databasePath));
        } finally {
            $this->removeDirectory($tempDir);
        }
    }

    public function test_gate2_local_refresh_script_restores_database_on_failure_after_backup(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $backendRoot = $repoRoot.DIRECTORY_SEPARATOR.'backend';
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-refresh-failure-test-'.uniqid('', true);
        $databasePath = $tempDir.DIRECTORY_SEPARATOR.'gate2-verify.sqlite';
        $evidenceDir = $tempDir.DIRECTORY_SEPARATOR.'evidence';

        mkdir($tempDir, 0777, true);

        try {
            $this->seedTempDatabase($backendRoot, $databasePath);
            $preRefreshHash = hash_file('sha256', $databasePath);

            $command = sprintf(
                'powershell -NoProfile -ExecutionPolicy Bypass -File %s -DatabasePath %s -EvidenceDir %s -InjectFailureAfter smoke',
                escapeshellarg($scriptPath),
                escapeshellarg($databasePath),
                escapeshellarg($evidenceDir),
            );

            exec($command, $output, $exitCode);

            $this->assertSame(1, $exitCode, implode(PHP_EOL, $output));
            $this->assertSame($preRefreshHash, hash_file('sha256', $databasePath));

            $manifest = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'manifest.txt');
            $this->assertIsString($manifest);
            $this->assertStringContainsString('failure_recovery=pass', $manifest);
            $this->assertStringContainsString('terminal_state=restored-pre-refresh', $manifest);
            $this->assertStringContainsString('recovery_row_counts_verified=true', $manifest);

            $log = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'run.log');
            $this->assertIsString($log);
            $this->assertStringContainsString('Failure recovery completed; terminal_state=restored-pre-refresh', $log);
        } finally {
            $this->removeDirectory($tempDir);
        }
    }

    public function test_gate2_local_refresh_script_writes_restore_failed_unsafe_terminal_state_when_recovery_fails(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $backendRoot = $repoRoot.DIRECTORY_SEPARATOR.'backend';
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-refresh-recovery-fail-test-'.uniqid('', true);
        $databasePath = $tempDir.DIRECTORY_SEPARATOR.'gate2-verify.sqlite';
        $evidenceDir = $tempDir.DIRECTORY_SEPARATOR.'evidence';

        mkdir($tempDir, 0777, true);

        try {
            $this->seedTempDatabase($backendRoot, $databasePath);

            $command = sprintf(
                'powershell -NoProfile -ExecutionPolicy Bypass -File %s -DatabasePath %s -EvidenceDir %s -InjectFailureAfter smoke -BreakRecoveryOnFailure',
                escapeshellarg($scriptPath),
                escapeshellarg($databasePath),
                escapeshellarg($evidenceDir),
            );

            exec($command, $output, $exitCode);

            $this->assertSame(1, $exitCode, implode(PHP_EOL, $output));

            $manifest = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'manifest.txt');
            $this->assertIsString($manifest);
            $this->assertStringContainsString('failure_recovery=fail', $manifest);
            $this->assertStringContainsString('terminal_state=restore-failed-unsafe', $manifest);

            $log = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'run.log');
            $this->assertIsString($log);
            $this->assertStringContainsString('terminal_state=restore-failed-unsafe', $log);
        } finally {
            $this->removeDirectory($tempDir);
        }
    }

    public function test_gate2_local_refresh_script_writes_no_backup_failed_terminal_state_without_prior_database(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gate2-refresh-no-backup-test-'.uniqid('', true);
        $databasePath = $tempDir.DIRECTORY_SEPARATOR.'gate2-verify.sqlite';
        $evidenceDir = $tempDir.DIRECTORY_SEPARATOR.'evidence';

        mkdir($tempDir, 0777, true);

        try {
            $command = sprintf(
                'powershell -NoProfile -ExecutionPolicy Bypass -File %s -DatabasePath %s -EvidenceDir %s -InjectFailureAfter migrate',
                escapeshellarg($scriptPath),
                escapeshellarg($databasePath),
                escapeshellarg($evidenceDir),
            );

            exec($command, $output, $exitCode);

            $this->assertSame(1, $exitCode, implode(PHP_EOL, $output));

            $manifest = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'manifest.txt');
            $this->assertIsString($manifest);
            $this->assertStringContainsString('had_existing_database=False', $manifest);
            $this->assertStringContainsString('failure_recovery=skipped_no_backup', $manifest);
            $this->assertStringContainsString('terminal_state=no-backup-failed', $manifest);

            $log = file_get_contents($evidenceDir.DIRECTORY_SEPARATOR.'run.log');
            $this->assertIsString($log);
            $this->assertStringContainsString('terminal_state=no-backup-failed', $log);
        } finally {
            $this->removeDirectory($tempDir);
        }
    }

    public function test_gate2_local_refresh_script_rejects_repo_default_database(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $defaultDb = $repoRoot.DIRECTORY_SEPARATOR.'backend'.DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'database.sqlite';

        $command = sprintf(
            'powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $ErrorActionPreference=\'Stop\'; & %s -DatabasePath %s 2>&1 | ForEach-Object { $_.ToString() } }"',
            escapeshellarg($scriptPath),
            escapeshellarg($defaultDb),
        );

        exec($command, $output, $exitCode);

        $this->assertSame(1, $exitCode);
    }

    public function test_gate2_local_refresh_script_rejects_env_default_database(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $backendRoot = $repoRoot.DIRECTORY_SEPARATOR.'backend';
        $scriptPath = $repoRoot.DIRECTORY_SEPARATOR.'scripts'.DIRECTORY_SEPARATOR.'gate2-local-refresh.ps1';
        $envDefaultDb = $this->resolveEnvDatabasePath(
            $backendRoot,
            $backendRoot.DIRECTORY_SEPARATOR.'.env',
        );

        $command = sprintf(
            'powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference=\'Continue\'; & %s -DatabasePath %s *>&1 | ForEach-Object { $_.ToString() }; exit $LASTEXITCODE"',
            escapeshellarg($scriptPath),
            escapeshellarg($envDefaultDb),
        );

        exec($command, $output, $exitCode);

        $combinedOutput = implode(PHP_EOL, $output);
        $repoDefaultDb = $backendRoot.DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'database.sqlite';

        $this->assertSame(1, $exitCode);

        if (realpath($envDefaultDb) === realpath($repoDefaultDb)) {
            if ($combinedOutput !== '') {
                $this->assertStringContainsString('Refusing repo default database', $combinedOutput);
            }
        } else {
            $this->assertStringContainsString('Refusing .env default database', $combinedOutput);
        }
    }

    private function seedTempDatabase(string $backendRoot, string $databasePath): void
    {
        $escapedPath = str_replace("'", "''", $databasePath);
        $command = sprintf(
            'powershell -NoProfile -Command "$env:DB_CONNECTION=\'sqlite\'; $env:DB_DATABASE=\'%s\'; $env:APP_ENV=\'local\'; Set-Location -LiteralPath %s; php artisan migrate:fresh --seed --force"',
            $escapedPath,
            escapeshellarg($backendRoot),
        );

        exec($command, $output, $exitCode);

        $this->assertSame(0, $exitCode, implode(PHP_EOL, $output));
        $this->assertFileExists($databasePath);
    }

    private function resolveEnvDatabasePath(string $backendRoot, string $envFile): string
    {
        $defaultPath = $backendRoot.DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'database.sqlite';

        if (! is_file($envFile)) {
            return $defaultPath;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES);

        if ($lines === false) {
            return $defaultPath;
        }

        foreach ($lines as $line) {
            if (! preg_match('/^\s*DB_DATABASE\s*=/', $line)) {
                continue;
            }

            $value = trim(substr($line, strpos($line, '=') + 1));
            $value = trim($value, "\"'");

            if ($value === '') {
                return $defaultPath;
            }

            if (! str_starts_with($value, '/') && ! preg_match('/^[A-Za-z]:[\\\\\\/]/', $value)) {
                return $backendRoot.DIRECTORY_SEPARATOR.str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $value);
            }

            return $value;
        }

        return $defaultPath;
    }

    private function removeDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        $items = scandir($directory);

        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory.DIRECTORY_SEPARATOR.$item;

            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                unlink($path);
            }
        }

        rmdir($directory);
    }
}
