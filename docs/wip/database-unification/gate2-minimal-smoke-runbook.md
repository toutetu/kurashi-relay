# Gate 2 Minimal Smoke Runbook

更新日: 2026-07-19

## 目的

refresh 後に、アプリが最小限の読取・書込 API を提供できることを確認する。
DB refreshは高リスク変更のため、`php artisan gate2:smoke` **1コマンド**を動作確認1回として使える。
featureテストは既存の補助資料であり、完了条件にはしない(DR-033)。

## 対象

| 経路 | 内容 |
|---|---|
| `php artisan gate2:smoke` | 明示 SQLite ファイル（`GATE2_SMOKE_DATABASE`）に対する HTTP スモーク |
| 既存featureテスト | ユーザーが追加検証を求めた場合だけ使う補助資料 |

## `gate2:smoke` の確認内容

`Gate2MinimalSmokeRunner` が次を順に実行する。

| ステップ | 確認内容 |
|---|---|
| health | `GET /api/health` が 200 と `service=kurashi-relay-api` を返す |
| dashboard read | `X-Family-Token` 付き `GET /api/dashboard` が success を返す |
| task-record write | `POST /api/task-records` が 201 で record id を返す |
| idempotent replay | 同一 `idempotency_key` の再 POST が 200・同一 id・`meta.deduplicated=true` |
| task-record cancel | `DELETE /api/task-records/{id}` が 200 で `cancelled_at` を設定する |

## 実行方法

### ローカル（Artisan）

```bash
cd backend
export GATE2_SMOKE_DATABASE=/path/to/gate2-verify.sqlite
export FAMILY_TOKEN=test-family-token
php artisan gate2:smoke
```

`GATE2_SMOKE_DATABASE` は on-disk SQLite ファイルのみ（`:memory:` 不可）。
コマンドは `database.default=sqlite` と `DB::setDefaultConnection('sqlite')` を設定し、
`GATE2_SMOKE_DATABASE` 以外の既定接続（pgsql / mysql 等）には触れない。

### ローカル（PHPUnit・通常は実行しない）

```bash
cd backend
php artisan test --filter=Gate2SmokeCommandTest
php artisan test --filter=Gate2MinimalSmokeTest
```

### refresh スクリプト経由

`scripts/gate2-local-refresh.ps1` が refresh 後に `gate2:smoke` を自動実行する。

### 本番（デプロイ後の最小確認1回）

本番では **トークン値を docs に書かず**、手元の安全な記録にのみ保持する。

正しい `X-Family-Token` 付きの `/api/dashboard` 読取を、画面操作または `curl` 1本で確認する。
書込・冪等・取消の追加確認は、ユーザーが明示した場合だけ行う。

## 合格条件

- `gate2:smoke` の summary が `fail=0`
- 401 / 503 の unexpected な失敗がない
- summary 行に対象 SQLite ファイルパスが含まれる

## 失敗時

1. `gate2-rollback-runbook.md` を参照する。
2. `gate2:verify` の出力を Gate 記録へ添付する。
3. Inertia 開始を止める。

## 関連

- `gate2-refresh-runbook.md`
- `gate2-local-gate-record-template.md`
