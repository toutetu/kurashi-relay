<#
  generate-draft.ps1
  毎日20:00にWindowsタスクスケジューラから実行し、日報の下書きを生成する。

  分担:
    - 決定的な部分(前回日報の特定・累計時間の抽出・対象作業日の判定・git材料の収集・メモ書き出し)
      はこのスクリプト(=無料)が行う。
    - 本文の清書(コミット文 → 読み手向けの日本語への書き直し)は Cursor(composer-2.5, 最安)に委譲する。
    - 作業時間・体調・感想・次回予定は人にしか分からないので【要確認】で残す(創作しない)。

  Cursorの呼び出しが失敗しても、_nippo_memo.md が引き継ぎ材料として残る。
  その場合は次に開いたセッションで /daily-log か「メモから日報を仕上げて」で続行できる。

  使い方:
    powershell -ExecutionPolicy Bypass -File generate-draft.ps1            # 通常(Cursor清書あり)
    powershell -ExecutionPolicy Bypass -File generate-draft.ps1 -NoCursor  # メモだけ作る(検証用)
#>
[CmdletBinding()]
param(
  [switch]$NoCursor,
  [string]$RepoRoot = 'C:\Users\r0110\Documents\あきちゃんとママのアプリ\kurashi-relay-laravel-react-starter'
)

$ErrorActionPreference = 'Stop'

$LogsDir  = Join-Path $RepoRoot 'docs\logs'
$MemoPath = Join-Path $LogsDir '_nippo_memo.md'
$RunLog   = Join-Path $LogsDir '_nippo_cron.log'
$CursorCmd = Join-Path $env:LOCALAPPDATA 'cursor-agent\cursor-agent.cmd'
$TotalBudgetHours = 100
$Weekdays = @('日','月','火','水','木','金','土')

function Write-RunLog([string]$msg) {
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $RunLog -Value $line -Encoding utf8
  Write-Verbose $line
}

function Write-Utf8NoBom([string]$path, [string]$content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $enc)
}

try {
  Set-Location $RepoRoot

  # --- 1. 前回の日報を特定 ---
  $logFiles = Get-ChildItem -Path $LogsDir -Filter 'daily_log_*.md' -ErrorAction SilentlyContinue | Sort-Object Name
  if (-not $logFiles) { Write-RunLog 'ABORT: 既存の daily_log_*.md が見つからない'; exit 1 }
  $lastLog = $logFiles[-1]
  if ($lastLog.Name -notmatch 'daily_log_(\d{4}-\d{2}-\d{2})\.md') {
    Write-RunLog "ABORT: ファイル名から日付を取得できない ($($lastLog.Name))"; exit 1
  }
  $lastDate = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd', $null)

  # 累計作業時間を抽出(例:「累計作業時間: 56時間」)。取れなければ null(=不明)。
  $lastCumulative = $null
  $cum = Select-String -Path $lastLog.FullName -Pattern '累計作業時間[:：]\s*([0-9]+)\s*時間' | Select-Object -First 1
  if ($cum) { $lastCumulative = [int]$cum.Matches[0].Groups[1].Value }
  $lastCumText = if ($null -ne $lastCumulative) { "${lastCumulative}時間" } else { '【要確認】' }

  # --- 2. 対象作業日を特定(前回日報の翌日〜今日で、コミットがあり、まだ日報が無い日) ---
  $today = (Get-Date).Date
  $targetDays = @()
  for ($d = $lastDate.AddDays(1); $d -le $today; $d = $d.AddDays(1)) {
    $ds = $d.ToString('yyyy-MM-dd')
    if (Test-Path (Join-Path $LogsDir ("daily_log_{0}.md" -f $ds))) { continue }
    $since = "$ds 00:00:00"
    $until = $d.AddDays(1).ToString('yyyy-MM-dd') + ' 00:00:00'
    $commits = @(git log --all --no-merges --since="$since" --until="$until" --pretty=format:"%s" 2>$null | Where-Object { $_ -and $_.Trim() })
    if ($commits.Count -gt 0) {
      $targetDays += [pscustomobject]@{
        Date    = $ds
        Weekday = $Weekdays[[int]$d.DayOfWeek]
        Commits = $commits
      }
    }
  }

  if ($targetDays.Count -eq 0) {
    Write-RunLog "対象作業日なし(前回=$($lastDate.ToString('yyyy-MM-dd')))。下書きは作らず終了"
    exit 0
  }

  # --- 3/4. Cursorへの指示 + 日ごとのメモを書き出す ---
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('# 日報執筆の指示(自動生成メモ)')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('docs/logs/日報AI代筆フォーマット.md を必ず読み、その構成・文体・粒度・禁止事項・文例に')
  [void]$sb.AppendLine('厳密に従って、下記の各日の日報を作成してください。')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('- 保存先: docs/logs/daily_log_<日付>.md(1日1ファイル)。ファイルには日報本文のみを書く(前後に説明文をつけない)')
  [void]$sb.AppendLine('- 「作業内容の材料」のコミット文はそのまま貼らない。固有名詞(テーブル名・ライブラリ名・コマンド)は')
  [void]$sb.AppendLine('  原則使わず、「何がどこまで進んだか」を読み手(毎日コードを見ていない人)向けの日本語に書き直す')
  [void]$sb.AppendLine('- 作業時間・体調・感想の出来事・次回予定は【要確認】のまま残す(メモにないことを創作しない)')
  [void]$sb.AppendLine("- 累計作業時間 = 前回累計 + その日の作業時間。前回累計 = $lastCumText。")
  [void]$sb.AppendLine("  今日の作業時間が【要確認】なので、累計とのこりも【要確認】でよい。のこり = ${TotalBudgetHours}時間 − 累計")
  [void]$sb.AppendLine('- Phase 構成と進捗の表は、状態が変わった日だけ入れる')
  [void]$sb.AppendLine('- 感想は指定の型(①全体の中でいまどこか ②今日なにをどう進めたか ③詰まった点→工夫→どうなったか ④体調・生活 ※必要な日だけ)で書く')
  [void]$sb.AppendLine('')
  foreach ($t in $targetDays) {
    [void]$sb.AppendLine("## $($t.Date)($($t.Weekday))のメモ")
    [void]$sb.AppendLine("- 前回の累計作業時間: $lastCumText")
    [void]$sb.AppendLine('- 今日の作業時間: 【要確認】時間')
    [void]$sb.AppendLine('- 体調: フィジカル 【要確認】 / メンタル 【要確認】')
    [void]$sb.AppendLine('- 感想に入れたい出来事: 【要確認】')
    [void]$sb.AppendLine('- 次回の作業予定: 【要確認】')
    [void]$sb.AppendLine('- 作業内容の材料(この日のコミット。ここから読み手向けに書き直す):')
    foreach ($c in $t.Commits) { [void]$sb.AppendLine("    - $c") }
    [void]$sb.AppendLine('')
  }
  Write-Utf8NoBom $MemoPath $sb.ToString()
  Write-RunLog ("メモ書き出し完了 対象日: {0}" -f (($targetDays | ForEach-Object { $_.Date }) -join ', '))

  # --- 5. Cursorに清書を委譲(ベストエフォート。失敗してもメモが残る) ---
  if ($NoCursor) { Write-RunLog '-NoCursor 指定のためCursor清書はスキップ'; Write-RunLog 'done'; exit 0 }

  $prompt = 'docs/logs/_nippo_memo.md を読んで、書かれている指示どおりに各日の日報ファイルを作成してください'
  $outFile = "$RunLog.cursor.out"
  $errFile = "$RunLog.cursor.err"
  try {
    $proc = Start-Process -FilePath $CursorCmd `
      -ArgumentList @('-p','--force','--trust','--model','composer-2.5','--workspace','.','--output-format','text', $prompt) `
      -WorkingDirectory $RepoRoot -NoNewWindow -PassThru `
      -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    if (-not $proc.WaitForExit(600000)) {
      try { $proc.Kill() } catch {}
      Write-RunLog 'Cursorがタイムアウト(10分)。メモを引き継ぎ材料として残す'
    } else {
      Write-RunLog "Cursor清書 終了コード $($proc.ExitCode)"
    }
  } catch {
    Write-RunLog "Cursor呼び出し失敗: $($_.Exception.Message)。メモを引き継ぎ材料として残す"
  }

  Write-RunLog 'done'
}
catch {
  Write-RunLog "UNHANDLED: $($_.Exception.Message)"
  exit 1
}
