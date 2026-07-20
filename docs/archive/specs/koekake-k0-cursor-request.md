# K0 実装依頼(Cursor) — マイグレーション統合とDBリセット準備

- 作成: Fable / 2026-07-17
- 参照: `docs/archive/phases/koekake-plan-01.md` §4 / `docs/design-decisions.md` DR-013
- 使用モデル: **composer-2.5(fast: false)**。難所は無い想定。
- ブランチ: 現在の作業ブランチのままでよい(バックエンドのみの小変更)。

## 背景(なぜ)

実運用前なので DB は破棄・再作成してよい(DR-013)。実運用開始までは
「ALTER 追加ではなく既存 CREATE の編集」でスキーマを管理する方針。
そのため後付けの ADD マイグレーション 1 本を CREATE 側へ統合し、ADD 本体と
それ専用のテストを削除する。

## 変更は 3 点(すべて `backend/` 配下)

### 1. CREATE に列を統合

`backend/database/migrations/2026_07_16_100003_create_task_records_table.php`
の CREATE 内、`$table->string('idempotency_key', 64)->unique();` の**直後**に
1 行追加する:

```php
$table->string('idempotency_key', 64)->unique();
$table->unsignedSmallInteger('granted_point_value')->default(0);   // ← 追加
$table->timestampsTz();
```

- 位置は `idempotency_key` の後・`timestampsTz()` の前。
- ADD 側にあったバックフィル処理は fresh 前提なので**移植しない**
  (新規レコードは `TaskRecordService` が作成時に値をセットする。
  `backend/app/Services/TaskRecordService.php` の insert で
  `'granted_point_value' => $taskDefinition->point_value` 済み)。

### 2. ADD マイグレーションを削除

`backend/database/migrations/2026_07_17_000002_add_granted_point_value_to_task_records_table.php`
を**ファイルごと削除**。

### 3. 廃止テストを削除

`backend/tests/Feature/Api/OshigotoPersistenceTest.php` の
`test_granted_point_value_migration_backfills_existing_records()`
(メソッド全体)を**削除**する。

- 理由: このテストは削除する ADD マイグレーションを直接
  `require database_path('migrations/2026_07_17_000002_...php')` しており、
  ファイルを消すと fatal になる。テスト対象(ADD の backfill 挙動)も消えるため役目終了。
- **残すテスト**(消さない):直前の
  `test_mother_points_use_the_value_granted_when_recorded()` は
  「作成時にポイントをスナップショットする」挙動の検証なので有効。緑のままにする。

## ローカル検証(実装者が実行)

```bash
cd backend
php artisan migrate:fresh --seed
php artisan test
```

- `migrate:fresh --seed` が通り、`task_records` に `granted_point_value` 列がある。
- `php artisan test` が**全緑**(上記テスト削除後)。lint/typecheck があれば併せて緑に。

## スコープ厳守

- 上記 3 ファイル以外は触らない。API・モデル・Service・シードは変更不要。
- 本番 DB へのリセット(`migrate:fresh --seed --force`)は**やらない**。
  main マージ後にユーザーが Laravel Cloud の Commands タブで実行する(承認済み・一回限り)。

## 完了後の報告

- 変更ファイル一覧、`php artisan test` の結果(件数/緑)を報告。
- Fable が `git diff --stat` + 要所をレビュー → main マージ → ユーザーが本番 fresh → Phase 8a スモークへ。
