# 実装依頼: 本番スキーマを夏休み対応に合わせる差分マイグレーション(2026-07-18)

宛先: Cursor **composer-2.5**(fast: false)
ブランチ: **最新 main から** `fix/musume-summer-migration` を切ること(既存ブランチに相乗りしない)
関連: DR-021(決定状態カラム廃止)/ **DR-022(この対応の方針)**

## 背景(必ず読むこと)

PR #27 で、DR-013 の方針に従い**ファイル名を変えずに CREATE マイグレーションを書き換えた**:

- `2026_07_18_200001_create_daily_plans_table.php`
- `2026_07_18_200002_create_plan_items_table.php`

しかし本番DBではこの2本が **K2リリース時にバッチ[2]で適用済み**だった。Laravel は適用済みの
マイグレーションを再実行しないため、**本番は旧スキーマのまま**で、夏休み機能が動いていない。

本番の `migrate:status` 実測(2026-07-18):

```
2026_07_18_200001_create_daily_plans_table ......................... [2] Ran
2026_07_18_200002_create_plan_items_table .......................... [2] Ran
2026_07_18_200003_create_reflection_sessions_table ................. [2] Ran
```

**本番には実データがある**(2026-07-18 の見通し3件+持ち物1件)。`migrate:fresh` は**使わない**。

## 直すべき差分

`git show 674a99d^:...` で確認済みの、旧スキーマ → 現CREATE の差分:

### `daily_plans`

| 操作 | カラム | 型 |
|---|---|---|
| DROP | `today_state` | `varchar(20) NOT NULL DEFAULT 'undecided'` |
| DROP | `tomorrow_items_state` | `varchar(20) NOT NULL DEFAULT 'undecided'` |
| DROP | `start_state` | `varchar(20) NOT NULL DEFAULT 'undecided'` |
| ADD | `start_decided_with` | `varchar(10) NULL` |

### `plan_items`

| 操作 | カラム | 型 |
|---|---|---|
| ADD | `decided_with` | `varchar(10) NULL` |

`reflection_sessions` は変更なし。

## 実装すること

### 1. 差分マイグレーションを1本追加

ファイル名: `backend/database/migrations/2026_07_18_210001_align_musume_plan_decided_with_columns.php`

**必須要件: `Schema::hasColumn()` で冪等にすること。**

理由: 新規環境(ローカル・CI・テスト)では**書き換え済みのCREATEが既に最終形を作る**ため、
ガード無しで `addColumn` すると「列が既に存在する」で落ちる。逆に本番では旧列が実在する。
**同じ1本のマイグレーションが、両方の形の環境で通る必要がある。**

```php
public function up(): void
{
    Schema::table('daily_plans', function (Blueprint $table) {
        if (! Schema::hasColumn('daily_plans', 'start_decided_with')) {
            $table->string('start_decided_with', 10)->nullable()->after('wake_up_time');
        }
    });

    // DROP は ADD と別クロージャに分ける(同一クロージャ内での hasColumn は
    // 変更適用前の状態を見るため、意図が読み取りにくくなる)
    foreach (['today_state', 'tomorrow_items_state', 'start_state'] as $column) {
        if (Schema::hasColumn('daily_plans', $column)) {
            Schema::table('daily_plans', function (Blueprint $table) use ($column) {
                $table->dropColumn($column);
            });
        }
    }

    Schema::table('plan_items', function (Blueprint $table) {
        if (! Schema::hasColumn('plan_items', 'decided_with')) {
            $table->string('decided_with', 10)->nullable()->after('status');
        }
    });
}
```

※ 上記は骨子。`after()` は Postgres では無視されるので付けなくてもよい(可読性のため残すのは可)。

`down()` も対称に、同じ `hasColumn` ガード付きで実装する(`*_state` 3本を
`->default('undecided')` で戻し、`start_decided_with` / `decided_with` を落とす)。

### 2. 旧データのバックフィルは **しない**

`today_state` 等に `'with_mama'` が入っていても **`decided_with` へ移さない**。

旧 `with_mama` = 「娘が決めかねたので**ママと決める**(先送り・**未**決定)」
新 `decided_with='mama'` = 「**ママと決めた**(決定済み)」

DR-021 の運用変更で**意味が反転している**。機械的に移すと「まだ決めていない」項目を
「決めた」と記録してしまう。**捨てるのが正しい。** 良かれと思ってバックフィルを足さないこと。

### 3. Pest featureテストを追加(完了条件・DR-017)

`backend/tests/Feature/` に追加。**最重要は「本番と同じ旧スキーマ形に対して当てて通るか」**なので、
スキーマ断言だけで終わらせないこと。

1. **最終形の断言**(fresh環境)
   - `daily_plans` に `start_decided_with` が有り、`today_state` / `tomorrow_items_state` /
     `start_state` が**無い**
   - `plan_items` に `decided_with` が有る
2. **本番経路の再現**(このテストが本命)
   - テスト内で旧スキーマ形へ戻す(`start_decided_with`・`decided_with` を drop し、
     `*_state` 3本を `default('undecided')` で add)
   - 既存データを1行入れておく(プラン1件+項目1件)
   - マイグレーションクラスを直接 `require` して `up()` を呼ぶ
   - 最終形になっていること **かつ 入れておいたデータが残っていること** を断言
3. **冪等性**
   - 続けて `up()` をもう一度呼んでも例外が出ないこと

### 4. スコープ外(触らないこと)

- CREATE マイグレーション2本(`200001` / `200002`)は**もう書き換えない**。現状の内容が最終形として正しい。
- モデル・サービス・コントローラ・フロントは**変更不要**(PR #27/#28 で新スキーマ前提に実装済み)。
- `db:seed` 関連は触らない。

## 完了条件

- [ ] `php artisan migrate:fresh` → `php artisan test` が緑(fresh環境で通る)
- [ ] 上記 featureテスト3種が緑(特に「本番経路の再現」でデータが残ること)
- [ ] `php artisan migrate` を**2回連続**実行しても落ちない
- [ ] 変更は `backend/database/migrations/` の新規1ファイル + テストのみ

## レビュー

実装完了後、Codex にレビュー依頼を出す(依頼書は Fable が別途作成)。
観点: 冪等ガードの漏れ / `down()` の対称性 / Postgres と SQLite の両方で通るか /
バックフィルを勝手に足していないか。
