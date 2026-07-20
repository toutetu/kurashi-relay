# Gate 2 Local / Production Gate Record Template

更新日: 2026-07-19

本テンプレートは Gate 2 通過可否の記録用である。**本番の接続文字列・トークン・個人データは書かない。**

---

## 基本情報

| 項目 | 記入 |
|---|---|
| 記録 ID | `gate2-YYYYMMDD-NN` |
| 対象環境 | `local` / `staging` / `production` |
| 実施日時 (JST) | |
| 実施者 | |
| 直前コミット SHA | |
| デプロイ ID / リリース名 | |
| refresh 経路 | `DR-031 managed refresh` / `local script only` |

## 対象 DB の特定

| 項目 | 記入 |
|---|---|
| DB 種別 | `PostgreSQL 17` / `SQLite (local verify)` |
| 接続先識別子 | サービス名・ホスト名のラベルのみ（秘密情報は別管理） |
| 本番と取り違えていない | `yes` / `no` |

## Backup 記録

| 項目 | 記入 |
|---|---|
| backup 取得 | `yes` / `no` / `n/a (local temp)` |
| backup 保存先ラベル | |
| backup SHA256 | |
| restore リハーサル | `pass` / `fail` / `skipped` |

### テーブル別件数（refresh 前）

```
family_members=
activity_definitions=
task_definitions=
routine_templates=
plan_questions=
reward_rules=
daily_plans=
daily_tasks=
activity_events=
planned_activities=
```

## Refresh 実施

| 項目 | 記入 |
|---|---|
| ユーザー明示承認 | `yes` / `n/a (local)` |
| 書込停止実施 | `yes` / `n/a` |
| migrate:fresh --seed | `pass` / `fail` / `not run` |
| 二回目 seed（件数不変） | `pass` / `fail` / `not run` |

## Schema 検証 (`php artisan gate2:verify`)

| 項目 | 記入 |
|---|---|
| 実行日時 (JST) | |
| driver | `pgsql` / `sqlite` |
| summary | `pass=__ fail=__ skip=__` |
| PostgreSQL CHECK / 部分 index / trigger | `measured` / `skipped (sqlite)` |
| 出力ログ保存先 | evidence パスまたは CI artifact |

## 最小スモーク (`php artisan gate2:smoke`)

| 項目 | 記入 |
|---|---|
| 実行日時 (JST) | |
| `GATE2_SMOKE_DATABASE` パス | on-disk SQLite のみ |
| summary | `pass=__ fail=__ skip=__` |
| health (`GET /api/health`) | `pass` / `fail` |
| dashboard read (`GET /api/dashboard`) | `pass` / `fail` |
| task-record write / replay / cancel | `pass` / `fail` |
| 本番 `/api/health` | `pass` / `fail` / `n/a` |
| 本番スモーク（トークン付き） | `pass` / `fail` / `n/a` |

## データ取扱い

| 項目 | 記入 |
|---|---|
| 旧 DB 全量 backup 保持 | `yes` / `no` |
| 実績データの自動 import | `no`（標準 refresh 経路） |
| D2〜D5 バックフィル実施 | `yes` / `no` |

## 残課題

-
-

## 画面移行(API-first SPA)開始可否

| 判定 | `GO` / `NO-GO` |
|---|---|
| 理由 | |

## 署名

| 役割 | 名前 | 日付 |
|---|---|---|
| 実施 | | |
| レビュー（Grok 等） | | |
| 合否判断 | | |

---

## ローカル証跡の例（SQLite）

`scripts/gate2-local-refresh.ps1` 実行後、次が evidence ディレクトリに残る。

- `manifest.txt` … 対象 DB・SHA256・件数・restore 結果・`terminal_state`
- `run.log` … 各ステップのログ
- `pre-refresh.sqlite` … refresh 前 backup（既存 DB があった場合）

失敗時の `terminal_state`:

| 値 | 意味 |
|---|---|
| `restored-pre-refresh` | backup から復元し SHA256・件数を検証済み |
| `restore-failed-unsafe` | 失敗後の復元も失敗（手動確認が必要） |
| `no-backup-failed` | 事前 backup なしで失敗 |

## 関連 runbook

- `gate2-backup-runbook.md`
- `gate2-refresh-runbook.md`
- `gate2-production-restore-runbook.md`
- `gate2-rollback-runbook.md`
- `gate2-minimal-smoke-runbook.md`
