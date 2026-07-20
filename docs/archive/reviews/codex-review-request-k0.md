# Codexレビュー依頼 K0: マイグレーション統合とDBリセット準備

対象: 現在の作業ブランチ。Cursor(composer-2.5)が実施した K0 の差分。
実装指示書: `docs/koekake-k0-cursor-request.md`
計画: `docs/archive/phases/koekake-plan-01.md` §4 / 判断: `docs/design-decisions.md` DR-013

## 依頼内容

**コード変更禁止・レビュー専任。** 結果を `docs/deploy_change/codex-review-report-k0.md` に
日本語で書く(新規作成のみ)。テスト実行可。

K0 は「後付け ADD マイグレーション 1 本を既存 CREATE に統合し、ADD 本体と
それ専用テストを削除する」小変更。実運用前のためスキーマは CREATE 編集で管理(DR-013)。

### 検証項目

1. **CREATE への列統合**:
   `backend/database/migrations/2026_07_16_100003_create_task_records_table.php` の CREATE 内に
   `$table->unsignedSmallInteger('granted_point_value')->default(0);` が
   `idempotency_key` の後・`timestampsTz()` の前に追加されているか。
   型と default(0)が削除した ADD の定義と一致するか。
2. **ADD マイグレーション削除**:
   `2026_07_17_000002_add_granted_point_value_to_task_records_table.php` が
   ファイルごと消えているか。
3. **廃止テスト削除**:
   `backend/tests/Feature/Api/OshigotoPersistenceTest.php` の
   `test_granted_point_value_migration_backfills_existing_records` が削除され、
   直前の `test_mother_points_use_the_value_granted_when_recorded`(作成時スナップショット検証)は
   残っているか。
4. **残存参照ゼロ**:
   削除した ADD ファイル名 `2026_07_17_000002` や backfill ロジックを参照している箇所が
   コード/テストに残っていないか(grep で確認)。
5. **テスト実行**:
   `cd backend && php artisan migrate:fresh --seed && php artisan test` が**全緑**か
   (件数と結果をレポートに記載)。`task_records` に `granted_point_value` 列が生成されるか。
6. **リグレッション**:
   `granted_point_value` を参照する既存コード
   (`TaskRecordService` / `RewardCalculator` / `TaskRecord` モデル / シード)が
   引き続き正しく機能するか。作成時に単価がスナップショットされる挙動が壊れていないか。
7. **スコープ**:
   `git diff --stat` で、指示書の 3 ファイル以外に変更が混入していないか。

## 前提(ブロッカー扱いにしないこと)

- バックフィル処理を移植しない判断は正しい(fresh 前提・新規レコードは
  `TaskRecordService` が作成時に `granted_point_value` をセットするため)。
- 本番 DB のリセット(`migrate:fresh --seed --force`)は main マージ後にユーザーが
  Commands タブで実行する(承認済み・一回限り)。レビューではローカル fresh のみ確認すればよい。

## レポート形式

重大 / 中程度 / 軽微 / テスト実行結果 / 総合判定(main マージ可否)。
