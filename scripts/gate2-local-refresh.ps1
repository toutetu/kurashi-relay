#Requires -Version 5.1
<#
.SYNOPSIS
  Gate 2 用のローカル検証DB refresh スクリプト。

.DESCRIPTION
  明示的に指定した SQLite DatabasePath だけを対象に、
  backup / migrate:fresh --seed / 二重 seed / gate2:verify / gate2:smoke / 復元リハーサルを実行する。
  リポジトリ既定の backend/database/database.sqlite と .env 既定DBは拒否する。
  backup 作成後に失敗した場合は pre-refresh.sqlite へ自動復元し、SHA256 と件数を検証して証跡を残す。

.PARAMETER DatabasePath
  検証対象の SQLite ファイルへの絶対パスまたは相対パス（必須）。

.PARAMETER EvidenceDir
  backup・件数・SHA256 などの証跡を書き出すディレクトリ。未指定時は DatabasePath 隣の gate2-evidence/<timestamp>。

.PARAMETER KeepRefreshedDatabase
  成功時に refresh 済み DB を保持する。既定では pre-refresh へ復元リハーサルを行う。

.PARAMETER InjectFailureAfter
  テスト専用。指定ステップ直後に意図的に失敗させる（migrate / second-seed / verify / smoke / restore）。

.EXAMPLE
  .\scripts\gate2-local-refresh.ps1 -DatabasePath C:\temp\gate2-verify.sqlite
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $DatabasePath,

    [string] $EvidenceDir = '',

    [switch] $KeepRefreshedDatabase,

    [ValidateSet('', 'migrate', 'second-seed', 'verify', 'smoke', 'restore')]
    [string] $InjectFailureAfter = '',

    [switch] $BreakRecoveryOnFailure
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-FullPath {
    param([string] $Path)

    if (Test-Path -LiteralPath $Path) {
        return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Path).Path)
    }

    return [System.IO.Path]::GetFullPath($Path)
}

function Get-EnvDatabasePath {
    param(
        [string] $BackendRoot,
        [string] $EnvFile
    )

    $defaultPath = Join-Path $BackendRoot 'database\database.sqlite'

    if (-not (Test-Path -LiteralPath $EnvFile)) {
        return $defaultPath
    }

    $line = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^\s*DB_DATABASE\s*=' } | Select-Object -First 1

    if (-not $line) {
        return $defaultPath
    }

    $value = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")

    if ([string]::IsNullOrWhiteSpace($value)) {
        return $defaultPath
    }

    if (-not [System.IO.Path]::IsPathRooted($value)) {
        return Join-Path $BackendRoot $value
    }

    return $value
}

function ConvertTo-CountMap {
    param([string[]] $Lines)

    $map = @{}

    foreach ($line in $Lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $parts = $line -split '=', 2
        $map[$parts[0]] = $parts[1]
    }

    return $map
}

function Get-TableRowCounts {
    param(
        [string] $BackendRoot,
        [string] $DatabaseFile
    )

    $php = @"
<?php
`$tables = array_filter(
    array_map('trim', explode(',', getenv('GATE2_TABLES') ?: '')),
    fn (`$table) => `$table !== ''
);
`$pdo = new PDO('sqlite:' . getenv('GATE2_DB'));
`$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
foreach (`$tables as `$table) {
    `$count = (int) `$pdo->query("SELECT COUNT(*) FROM [`$table]")->fetchColumn();
    echo `$table . '=' . `$count . PHP_EOL;
}
"@

    $tables = @(
        'family_members', 'activity_definitions', 'task_definitions', 'routine_templates',
        'prompt_templates', 'plan_questions', 'reward_rules', 'daily_plans', 'daily_tasks',
        'activity_events', 'planned_activities', 'plan_answer_versions'
    ) -join ','

    $previousGate2Db = $env:GATE2_DB
    $previousGate2Tables = $env:GATE2_TABLES
    $env:GATE2_DB = $DatabaseFile
    $env:GATE2_TABLES = $tables

    try {
        $output = $php | & php
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to read table row counts from $DatabaseFile"
        }

        return $output
    }
    finally {
        if ($null -eq $previousGate2Db) {
            Remove-Item Env:GATE2_DB -ErrorAction SilentlyContinue
        }
        else {
            $env:GATE2_DB = $previousGate2Db
        }

        if ($null -eq $previousGate2Tables) {
            Remove-Item Env:GATE2_TABLES -ErrorAction SilentlyContinue
        }
        else {
            $env:GATE2_TABLES = $previousGate2Tables
        }
    }
}

function Invoke-Artisan {
    param(
        [string] $BackendRoot,
        [hashtable] $Environment,
        [string[]] $Arguments
    )

    Push-Location $BackendRoot
    try {
        foreach ($key in $Environment.Keys) {
            Set-Item -Path "env:$key" -Value $Environment[$key]
        }

        & php artisan @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "artisan $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Assert-NoInjectedFailure {
    param([string] $Step)

    if ($InjectFailureAfter -eq $Step) {
        throw "Injected failure after $Step"
    }
}

function Restore-PreRefreshDatabase {
    param(
        [string] $BackupFile,
        [string] $TargetDb,
        [string] $ExpectedSha256,
        [hashtable] $ExpectedCounts,
        [string] $BackendRoot,
        [switch] $BreakRecovery
    )

    if ($BreakRecovery) {
        throw 'Injected recovery failure for testing'
    }

    Copy-Item -LiteralPath $BackupFile -Destination $TargetDb -Force

    $actualSha256 = (Get-FileHash -LiteralPath $TargetDb -Algorithm SHA256).Hash
    if ($actualSha256 -ne $ExpectedSha256) {
        throw "Restore SHA256 mismatch. expected=$ExpectedSha256 actual=$actualSha256"
    }

    $actualCounts = Get-TableRowCounts -BackendRoot $BackendRoot -DatabaseFile $TargetDb
    $actualMap = ConvertTo-CountMap -Lines $actualCounts

    foreach ($table in $ExpectedCounts.Keys) {
        $expectedCount = $ExpectedCounts[$table]
        $actualCount = $actualMap[$table]

        if ($actualCount -ne $expectedCount) {
            throw "Restore count mismatch for $table. expected=$expectedCount actual=$actualCount"
        }
    }

    return @{
        sha256 = $actualSha256
        counts = $actualCounts
    }
}

function Write-RecoveryEvidence {
    param(
        [string] $ManifestFile,
        [string] $LogFile,
        [hashtable] $RecoveryResult,
        [string] $FailureMessage
    )

    Add-Content -LiteralPath $ManifestFile -Value "failure=$FailureMessage"
    Add-Content -LiteralPath $ManifestFile -Value 'failure_recovery=pass'
    Add-Content -LiteralPath $ManifestFile -Value "recovery_sha256=$($RecoveryResult.sha256)"
    Add-Content -LiteralPath $ManifestFile -Value 'recovery_row_counts_verified=true'
    Add-Content -LiteralPath $ManifestFile -Value 'terminal_state=restored-pre-refresh'
    Add-Content -LiteralPath $ManifestFile -Value 'recovery_counts:'
    Add-Content -LiteralPath $ManifestFile -Value ($RecoveryResult.counts -join [Environment]::NewLine)

    Add-Content -LiteralPath $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Failure recovery completed; terminal_state=restored-pre-refresh"
}

$repoRoot = Resolve-FullPath (Join-Path $PSScriptRoot '..')
$backendRoot = Join-Path $repoRoot 'backend'
$repoDefaultDb = Join-Path $backendRoot 'database\database.sqlite'
$envDefaultDb = Get-EnvDatabasePath -BackendRoot $backendRoot -EnvFile (Join-Path $backendRoot '.env')
$targetDb = Resolve-FullPath $DatabasePath

if ($targetDb -ieq (Resolve-FullPath $repoDefaultDb)) {
    Write-Error "Refusing repo default database: $targetDb"
    exit 1
}

if ($targetDb -ieq (Resolve-FullPath $envDefaultDb)) {
    Write-Error "Refusing .env default database: $targetDb"
    exit 1
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path (Split-Path -Parent $targetDb) "gate2-evidence\$timestamp"
}
$EvidenceDir = Resolve-FullPath $EvidenceDir
New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null

$backupFile = Join-Path $EvidenceDir 'pre-refresh.sqlite'
$manifestFile = Join-Path $EvidenceDir 'manifest.txt'
$logFile = Join-Path $EvidenceDir 'run.log'

function Write-Log {
    param([string] $Message)
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Write-Host $line
    Add-Content -LiteralPath $logFile -Value $line
}

Write-Log 'Gate 2 local refresh starting'
Write-Log "Target database: $targetDb"
Write-Log "Evidence directory: $EvidenceDir"

$hadExistingDatabase = Test-Path -LiteralPath $targetDb
$preCounts = @()
$preSha256 = ''
$preCountMap = @{}

if ($hadExistingDatabase) {
    Copy-Item -LiteralPath $targetDb -Destination $backupFile -Force
    $preSha256 = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
    $preCounts = Get-TableRowCounts -BackendRoot $backendRoot -DatabaseFile $backupFile
    $preCountMap = ConvertTo-CountMap -Lines $preCounts
    Write-Log "Pre-refresh backup created: $backupFile"
    Write-Log "Pre-refresh SHA256: $preSha256"
    $preCounts | ForEach-Object { Write-Log "Pre-refresh count $_" }
}
else {
    Write-Log 'No existing database file; backup step records empty baseline'
    New-Item -ItemType File -Path $targetDb -Force | Out-Null
    Remove-Item -LiteralPath $targetDb -Force
}

@(
    "target_database=$targetDb",
    "evidence_dir=$EvidenceDir",
    "had_existing_database=$hadExistingDatabase",
    "pre_refresh_sha256=$preSha256",
    "pre_refresh_counts:",
    ($preCounts -join [Environment]::NewLine)
) | Set-Content -LiteralPath $manifestFile -Encoding UTF8

$artisanEnv = @{
    DB_CONNECTION = 'sqlite'
    DB_DATABASE   = $targetDb
    APP_ENV       = 'local'
}

$smokeEnv = @{
    DB_CONNECTION        = 'sqlite'
    DB_DATABASE          = $targetDb
    GATE2_SMOKE_DATABASE = $targetDb
    APP_ENV              = 'local'
    FAMILY_TOKEN         = 'test-family-token'
    CACHE_STORE          = 'array'
}

try {
    Write-Log 'Running migrate:fresh --seed'
    Invoke-Artisan -BackendRoot $backendRoot -Environment $artisanEnv -Arguments @('migrate:fresh', '--seed', '--force')
    Assert-NoInjectedFailure -Step 'migrate'

    Write-Log 'Running second seed'
    Invoke-Artisan -BackendRoot $backendRoot -Environment $artisanEnv -Arguments @('db:seed', '--force')
    Assert-NoInjectedFailure -Step 'second-seed'

    Write-Log 'Running gate2:verify'
    Invoke-Artisan -BackendRoot $backendRoot -Environment $artisanEnv -Arguments @('gate2:verify')
    Assert-NoInjectedFailure -Step 'verify'

    Write-Log 'Running gate2:smoke against refreshed database'
    Invoke-Artisan -BackendRoot $backendRoot -Environment $smokeEnv -Arguments @('gate2:smoke')
    Assert-NoInjectedFailure -Step 'smoke'

    if ($KeepRefreshedDatabase) {
        Write-Log 'Keeping refreshed database (-KeepRefreshedDatabase)'
        Add-Content -LiteralPath $manifestFile -Value 'restore_rehearsal=skipped_keep_refreshed'
        Add-Content -LiteralPath $manifestFile -Value 'terminal_state=refreshed-kept'
        Write-Log 'terminal_state=refreshed-kept'
    }
    elseif ($hadExistingDatabase) {
        Write-Log 'Restore rehearsal: copying backup over refreshed database'
        $recoveryResult = Restore-PreRefreshDatabase `
            -BackupFile $backupFile `
            -TargetDb $targetDb `
            -ExpectedSha256 $preSha256 `
            -ExpectedCounts $preCountMap `
            -BackendRoot $backendRoot
        Assert-NoInjectedFailure -Step 'restore'

        Add-Content -LiteralPath $manifestFile -Value 'restore_rehearsal=pass'
        Add-Content -LiteralPath $manifestFile -Value "restored_sha256=$($recoveryResult.sha256)"
        Add-Content -LiteralPath $manifestFile -Value 'terminal_state=restored-pre-refresh'
        Write-Log 'Restore rehearsal passed'
        Write-Log 'terminal_state=restored-pre-refresh'
    }
    else {
        Write-Log 'Restore rehearsal skipped (no pre-existing database)'
        Add-Content -LiteralPath $manifestFile -Value 'restore_rehearsal=skipped_no_prior_database'
        Add-Content -LiteralPath $manifestFile -Value 'terminal_state=refreshed-kept'
        Write-Log 'terminal_state=refreshed-kept'
    }

    Write-Log 'Gate 2 local refresh completed successfully'
    exit 0
}
catch {
    $failureMessage = $_.Exception.Message
    Write-Log "Gate 2 local refresh failed: $failureMessage"

    if ($hadExistingDatabase -and (Test-Path -LiteralPath $backupFile)) {
        try {
            Write-Log 'Failure recovery: restoring pre-refresh database'
            $recoveryResult = Restore-PreRefreshDatabase `
                -BackupFile $backupFile `
                -TargetDb $targetDb `
                -ExpectedSha256 $preSha256 `
                -ExpectedCounts $preCountMap `
                -BackendRoot $backendRoot `
                -BreakRecovery:$BreakRecoveryOnFailure
            Write-RecoveryEvidence -ManifestFile $manifestFile -LogFile $logFile -RecoveryResult $recoveryResult -FailureMessage $failureMessage
            Write-Log 'Failure recovery: SHA256 and row counts verified'
        }
        catch {
            $recoveryError = $_.Exception.Message
            Write-Log "Failure recovery failed: $recoveryError"
            Add-Content -LiteralPath $manifestFile -Value "failure=$failureMessage"
            Add-Content -LiteralPath $manifestFile -Value 'failure_recovery=fail'
            Add-Content -LiteralPath $manifestFile -Value "failure_recovery_error=$recoveryError"
            Add-Content -LiteralPath $manifestFile -Value 'terminal_state=restore-failed-unsafe'
            Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Failure recovery failed; terminal_state=restore-failed-unsafe"
        }
    }
    else {
        Add-Content -LiteralPath $manifestFile -Value "failure=$failureMessage"
        Add-Content -LiteralPath $manifestFile -Value 'failure_recovery=skipped_no_backup'
        Add-Content -LiteralPath $manifestFile -Value 'terminal_state=no-backup-failed'
        Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Failure recovery skipped; terminal_state=no-backup-failed"
    }

    exit 1
}
