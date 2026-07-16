# 永続化バックエンド修正スペック02(Codexレビュー対応)

対象: ブランチ `feature/oshigoto-persistence-api`(このブランチ上で続けて作業。pushしない)
根拠: `docs/deploy_change/codex-review-report-01.md`
元スペック: `docs/deploy_change/oshigoto-persistence-backend-spec.md`(その厳守事項をすべて引き継ぐ。frontend/変更禁止・破壊的migration禁止・新規パッケージ禁止)

## 1. 【重大1】受理済みidempotency_keyの全永続化

現状: 業務重複(同member×task×dateの有効レコード既存)で200を返した別キーが保存されず、「別キーPOST→応答喪失→取消→別キー再送」で取消済みが復活する(レビュー報告の6手順)。

修正:

- 新テーブル `task_record_operations`(マイグレーション追加。既存テーブルのalter不要):
  - `id` / `idempotency_key` string(64) **UNIQUE** / `family_member_id` FK / `task_definition_id` FK / `record_date` date / `task_record_id` FK(task_records) / timestampsTz
- POSTで**受理した全操作**(新規201・重複200の両方)についてこのテーブルへ行を作成し、canonicalな `task_record_id` を紐付ける。
- POST処理の照合順序: ①`task_record_operations` からキー検索 → あればpayload照合(不一致409)し、紐付くレコードの**現在の状態**(取消済みなら取消済みのまま)+現在のsummaryで200を返す。**新規レコードは作らない。** ②キー未登録なら従来の有効レコード判定へ。
- 既存の `task_records.idempotency_key` カラムは残してよい(新規行には引き続き記録)が、照合の正はoperationsテーブルとする。
- 競合時(同時INSERTのunique違反)のリカバリでも、勝者レコードへ自キーのoperations行を追加してから200を返す。

テスト追加: レビュー報告の6手順を再現し、最後の再送が**200/deduplicated=true/新規行なし**になること。

## 2. 【中2】QueryExceptionリカバリをunique違反に限定

`recoverFromInsertConflict` はSQLSTATE `23505`(sqliteは23000系/`UNIQUE constraint failed`文字列)の場合のみ実行し、その他のDB例外はそのまま再throwする。ドライバ差はヘルパで吸収(例: `$e->getCode()==='23505' || str_contains($e->getMessage(), 'UNIQUE constraint failed')`)。

## 3. 【中1】pgsql接続タイムゾーンのUTC固定

`config/database.php` の `pgsql` 接続に `'timezone' => 'UTC'` を追加(LaravelのPostgresConnectorが接続時に `set time zone` を発行する)。sqlite/テストへの影響なし。

## 4. 【中4】DELETEルートの数値制約とエラー形統一

- `routes/api.php` のDELETEルートへ `->whereNumber('id')` を付与(非数値は404)。
- `bootstrap/app.php` の汎用APIエラーレンダラで、404だけでなく**全ステータス**(500/405含む)に `'errors' => (object) []` を含め、`docs/api-contract-01.md` の共通形に統一。
- 更新系操作で失敗した場合の汎用500メッセージを「処理中に問題が発生しました。」等の中立文言へ(「取得中」固定をやめる)。

テスト追加: `DELETE /api/task-records/not-a-number` → 404 JSON(status/message/errors)。405・500系の形も1ケースずつ。

## 5. 【中5】完了時点のポイント単価スナップショット

- `task_records` へ `granted_point_value` unsignedSmallInteger default 0 を追加(**新規migrationでaddColumn**。既存migrationの書き換え禁止=まだ本番未適用だが履歴を汚さないため追加migrationとする)。
- POST時に `task_definitions.point_value` の現在値を保存。
- `RewardCalculator` の母ポイント集計を「有効レコードの `granted_point_value` 合計」へ変更(definitionsへのJOIN廃止)。将来単価を変えても過去実績が変わらない。

## 6. 【重大2】あいことば(家族共有トークン)によるAPI保護 ※【2026-07-17 ユーザー判断により今回は見送り。実装しない】

- 環境変数 `FAMILY_TOKEN`(未設定時は保護無効=ローカル開発の利便のため)。`config/kurashi.php` へ `family_token` として追加。
- ミドルウェア `EnsureFamilyToken` を作成し、**更新系ルート(POST/DELETE)と取得系の全おしごとAPI**(/api/tasks, /api/task-records, /api/rewards/*)に適用。`/api/health` と `/api/dashboard` は対象外(既存挙動維持)。
- リクエストヘッダ `X-Family-Token` が `family_token` と一致しない場合、401で共通エラー形 `{"status":"error","message":"あいことばが確認できませんでした。","errors":{}}` を返す。比較は `hash_equals`。
- CORS: `config/cors.php` の `allowed_headers` は `['*']` のため追加作業不要だが、プリフライトが通ることをテストで確認。
- テスト: トークン一致で200/未設定サーバでは素通り/不一致・欠落で401。既存health/dashboardはトークン無しで通ること。

## 7. 品質確認と報告

```bash
cd backend && php artisan test && ./vendor/bin/pint --test
```

全緑にしてから、変更ファイル・テスト結果・未完了(pgsql実機テストはPhase 6送り)を報告。コミットは論理単位でConventional Commits(pushしない)。
