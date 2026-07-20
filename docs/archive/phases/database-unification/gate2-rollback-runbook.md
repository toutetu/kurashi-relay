# Gate 2 Rollback Runbook

更新日: 2026-07-19

## 目的

refresh 中・直後の失敗時に、**アプリケーションと DB の両方**を安全な直前状態へ戻す。

## 発動条件

- migration / seed 失敗
- `php artisan gate2:verify` で `fail > 0`
- 最小スモーク失敗
- 起動不能・必須制約不足

## 原則

1. **production recovery は backup restore を正**とする。破壊的 migration の `down()` に依存しない。
2. **コードは直前リリースへ再配信**する（Laravel Cloud rollback）。
3. **旧 Render API** は別デプロイのロールバック先として残す。
4. 書込再開は restore + スモーク PASS 後のみ。

## 手順

### 1. 即時停止

- 書込を止めたままにする。
- 失敗した migration / seed の追加実行を止める。

### 2. アプリケーション rollback

- Laravel Cloud で直前の正常デプロイへ戻す。
- 必要ならフロント（Render）も互換のある直前版へ戻す。

### 3. DB restore

- `gate2-production-restore-runbook.md` に従い refresh 前 backup を restore する。

### 4. 検証

- テーブル別件数が backup 記録と一致。
- `/api/health` と `gate2:smoke` 相当の最小スモークが PASS。
- 家族共有トークン保護が有効。

### 5. 記録

- 失敗原因、実施した rollback 手順、復旧時刻を Gate 記録へ追記する。
- 画面移行(API-first SPA)は開始しない。

## ローカル検証での rollback

`scripts/gate2-local-refresh.ps1` は最後に **復元リハーサル** を行う。
失敗時は `manifest.txt` の `terminal_state` を確認する（`restored-pre-refresh` / `restore-failed-unsafe` / `no-backup-failed`）。
本番と同様、実際の rollback は evidence 内の `pre-refresh.sqlite` を対象 DB へ戻す。

## 安全な migration rollback の範囲

空 DB または検証用 DB でのみ、追加専用 migration の `down()` → 再適用を確認する。
データを含む本番 DB では `migrate:rollback` を標準経路にしない。

## 関連

- `gate2-production-restore-runbook.md`
- `gate2-backup-runbook.md`
- `gate2-local-gate-record-template.md`
