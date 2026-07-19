# Cursor実装依頼: 夏休み対応 バックエンド(PR1 `feat/musume-summer-backend`)

あなた(Cursor composer-2.5)への実装依頼です。以下を厳密に守って実装してください。

## 正とするもの

1. **スペック**: `docs/wip/musume-summer/musume-summer-spec.md` の **§2〜§5**。これが正。
2. **背景**: 同スペック §1 と `docs/design-decisions.md` の **DR-021**。
   なぜカラムを消すのかを理解してから着手すること。
3. **既存実装**: 変更前に必ず
   `backend/app/Services/Musume/MusumePlanService.php` を全文読むこと。
   特に `replaceItems()` / `formatPlanResponse()` / `getSummary()` / `ensurePlan` 系。

## 作業範囲: `backend/` のみ

**`frontend/` は一切触らないでください。** フロントは別PRで対応します。
この変更でフロントの型が壊れますが、それは想定どおりです。

## やること(スペック §2〜§5)

1. **既存CREATEマイグレーションを編集**する(§2)。**新規マイグレーションを作らないこと**(DR-013)。
   - `2026_07_18_200001_create_daily_plans_table.php`: `today_state` / `tomorrow_items_state` /
     `start_state` を削除し、`start_decided_with`(nullable, string 10)を追加。
   - `2026_07_18_200002_create_plan_items_table.php`: `decided_with`(nullable, string 10)を追加。
2. モデルの `$fillable` を合わせる(§2-3)。
3. `ReplacePlanItemsRequest` に `tomorrow_plan` カテゴリと `decided_with` を追加(§4-1)。
4. `UpdatePlanRequest` から `*_state` を削除し `start_decided_with` を追加(§4-2)。
5. `MusumePlanService`:
   - `replaceItems()` に `?string $decidedWith = null` を追加し全行に入れる。
   - **`today_state` / `tomorrow_items_state` を更新している if/elseif ブロックを削除**(§4-1)。
   - `formatPlanResponse()` から `*_state` を削除、`start_decided_with` と
     `items.tomorrow_plan` を追加、各itemに `decided_with` を含める(§4-3)。
   - `getSummary()` に `tomorrow_plans` と**ネストした `decided_with` オブジェクト**を追加(§4-4)。
6. `PlanController` が `decided_with` を service に渡すよう配線する。
7. **Pest feature テストを §5 の6項目ぶん**追加・改修する(DR-017: テストは完了条件)。
   既存の musume 系テストで `*_state` を参照しているものは §3 の導出ルールに沿って書き換える。
8. seeder / fixture が `*_state` を参照していれば直す(`grep` で確認すること)。

## 完了条件

- `backend` で `php artisan test` が**全緑**。
- `vendor/bin/pint` を適用済み。
- `php artisan migrate:fresh --seed` が通る。
- `git grep -n "today_state\|tomorrow_items_state\|start_state"` が
  **`backend/` 配下で0件**(docs は対象外)。

## 厳守事項

- `frontend/` と `docs/` を変更しない。
- 新規マイグレーションを作らない(既存CREATEを編集する)。
- composer パッケージを追加しない。
- 認証・アクセス保護を足さない(DR-007)。
- **`git commit` / `git push` をしない。** ブランチは既に `feat/musume-summer-backend`。
- スペックと既存実装が食い違う箇所は、勝手に判断せず**その場で止めて報告**すること。
