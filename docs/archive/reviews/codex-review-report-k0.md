# Codexレビュー報告 K0: マイグレーション統合とDBリセット準備

- レビュー日: 2026-07-17
- 対象: 現在の作業ブランチにある K0 差分
- 参照: `docs/deploy_change/codex-review-request-k0.md`

## 重大

なし。

## 中程度

なし。

## 軽微

なし。

## 検証内容

1. **CREATE への列統合: 適合**
   - `2026_07_16_100003_create_task_records_table.php` の CREATE 内で、
     `idempotency_key` の直後かつ `timestampsTz()` の直前に
     `$table->unsignedSmallInteger('granted_point_value')->default(0);` が追加されている。
   - 型と `default(0)` は、削除された ADD マイグレーションの定義と一致している。

2. **ADD マイグレーション削除: 適合**
   - `2026_07_17_000002_add_granted_point_value_to_task_records_table.php` はファイルごと削除されている。

3. **廃止テスト削除: 適合**
   - `test_granted_point_value_migration_backfills_existing_records` はメソッド全体が削除されている。
   - 直前の `test_mother_points_use_the_value_granted_when_recorded` は残っており、作成時単価の
     スナップショットと、その後のタスク定義単価変更の影響を受けないことを引き続き検証している。
   - 不要になった `DB` import の削除と、カスタムマイグレーション本数の期待値 `7` から `6` への更新も妥当。

4. **残存参照: 問題なし**
   - `rg` で `2026_07_17_000002` と backfill 参照を検索し、コード・テスト内に残存がないことを確認した。
   - `granted_point_value` の残存参照は、CREATE、`TaskRecordService`、`RewardCalculator`、
     `TaskRecord` モデル、および有効なスナップショットテストのみで、いずれも意図された参照である。

5. **リグレッション: 問題なし**
   - `TaskRecordService` は新規記録作成時に `TaskDefinition.point_value` を
     `granted_point_value` へ保存している。
   - `RewardCalculator` は有効な母の記録の `granted_point_value` を合計している。
   - `TaskRecord` は同列を fillable と integer cast に保持している。
   - シードされたタスク定義のポイント値を使う記録作成とスナップショット挙動は、全テスト成功により確認できた。

6. **スコープ: 適合**
   - レビュー前の `git diff --stat` は指示書どおり次の3ファイルのみで、
     `3 files changed, 2 insertions(+), 77 deletions(-)` だった。
     - CREATE マイグレーション
     - 削除対象の ADD マイグレーション
     - `OshigotoPersistenceTest.php`
   - リポジトリ直下に未追跡の `.claude/settings.local.json` があるが、K0 の差分には含まれていない。

## テスト実行結果

- `php artisan migrate:fresh --seed`: 成功
  - CREATE マイグレーション6本がすべて成功し、シードも成功した。
- fresh後の `Schema::hasColumn('task_records', 'granted_point_value')`: `true`
- `php artisan test`: 成功
  - **35 passed / 258 assertions / 失敗0**
- `vendor/bin/pint --test`: 成功
- `git diff --check`: 成功

補足: 列確認で最初に試した `php artisan tinker` は、PsySH がワークスペース外の設定ディレクトリへ
書き込もうとして実行環境の制限により停止した。Laravelを直接ブートする読み取り専用コマンドへ切り替え、
同じ列確認を完了しているため、アプリケーションまたは差分の不具合ではない。

## 総合判定（main マージ可否）

**main へマージ可。**

K0 の実装は指示書、`docs/archive/phases/koekake-plan-01.md` §4、および DR-013 に適合している。
重大・中程度・軽微の指摘はなく、ローカル fresh、列生成、全バックエンドテスト、Pint のすべてが成功した。
