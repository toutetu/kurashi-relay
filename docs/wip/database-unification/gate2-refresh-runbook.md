# Gate 2 Refresh Runbook

更新日: 2026-07-19

## 目的

DR-031 / DR-032 の管理下 DB refresh を、Gate 1 で確定した条件どおりに実行する。

## 適用条件

次をすべて満たす場合のみ実行する。

1. Phase C / D1 / E の target schema migration と master Seeder が実装済み。
2. 家族共有トークン（Phase A）が有効。
3. 全量 backup・件数・SHA256・restore 手順が記録済み。
4. ユーザーが実行直前に明示承認した。

## 標準経路

### 本番（PostgreSQL 17）

1. 書込停止を開始し、影響を記録する。
2. `gate2-backup-runbook.md` に従い全量 backup を取得する。
3. 直前リリースをロールバック可能な状態に保つ。
4. 管理下 refresh を実行する（例: `migrate:fresh --seed`）。
5. master Seeder を **2 回目** 実行し、件数が増殖しないことを確認する。
6. `php artisan gate2:verify` を実行する（PostgreSQL では CHECK / 部分 index / trigger も実測）。
7. `gate2-minimal-smoke-runbook.md` の最小スモークを実行する。
8. 結果を `gate2-local-gate-record-template.md`（本番欄）へ記録する。

### ローカル検証（SQLite）

本番 DB や `.env` 既定 DB は対象外。明示パスのみ。

```powershell
.\scripts\gate2-local-refresh.ps1 -DatabasePath C:\path\to\gate2-verify.sqlite
```

スクリプトが実行する内容:

1. 対象パス拒否判定（repo 既定 / `.env` 既定）
2. backup + SHA256 + テーブル別件数
3. `migrate:fresh --seed`
4. 二回目 `db:seed`
5. `php artisan gate2:verify`
6. `php artisan gate2:smoke`（health / dashboard read / task-record write / idempotent replay / cancel）
7. backup からの復元リハーサル

## seed 対象（master のみ）

- `family_members`
- `activity_definitions`
- `task_definitions`
- `routine_templates`
- `prompt_templates`
- `plan_questions`
- `reward_rules`

実績・履歴・台帳・回答・予定は seed しない。

## 完了条件

- `gate2:verify` が `fail=0`
- 最小スモークが PASS
- backup / restore 手順が検証済み
- Gate 記録が残っている

## 禁止事項

- `backend/database/database.sqlite` を無指定で refresh しない。
- D2〜D5 バックフィルを refresh 経路へ混ぜない。
- 本番値・トークンを docs へ書かない。

## 関連

- `gate2-backup-runbook.md`
- `gate2-production-restore-runbook.md`
- `gate2-rollback-runbook.md`
- `gate2-minimal-smoke-runbook.md`
