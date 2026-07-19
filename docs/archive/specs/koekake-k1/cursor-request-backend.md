# Cursor実装依頼: K1 声かけリマインダー バックエンド

あなた(Cursor composer-2.5)への実装依頼です。以下を厳密に守って実装してください。

## 読むべきスペック(唯一の正)

`docs/wip/koekake-k1/koekake-k1-spec.md` の **「バックエンド(PR1)」章(§2〜§6)** を実装する。
本依頼書はその要約と注意点。**スペック本文が正**。食い違いを見つけたら勝手に判断せず、コメントで明示して止める。

## 作るもの(backend/ 配下・Laravel)

1. **マイグレーション6本**(`backend/database/migrations/`・スペック§2の定義そのまま)
   - `2026_07_18_100001_create_routine_templates_table.php`
   - `2026_07_18_100002_create_prompt_templates_table.php`
   - `2026_07_18_100003_create_daily_tasks_table.php`
   - `2026_07_18_100004_create_prompt_events_table.php`
   - `2026_07_18_100005_create_completion_events_table.php`
   - `2026_07_18_100006_create_reminder_schedules_table.php`
   - 型・命名は既存 `2026_07_16_100003_create_task_records_table.php` の流儀(`timestampsTz`/`timestampTz`/string長/unique)に合わせる。

2. **モデル6本**(`backend/app/Models/`・スペック§3-1)
   - `RoutineTemplate` / `PromptTemplate` / `DailyTask` / `PromptEvent` / `CompletionEvent` / `ReminderSchedule`
   - fillable・casts・リレーションを既存モデルの流儀で。

3. **KoekakeSeeder**(`backend/database/seeders/`・スペック§3-2)
   - ルーチン22本(§3-2の表: phase/sort/name/icon/activity_key/daily_limit/default_time/parent_prompt_label/child_label/quick_label を**一字一句そのまま**)
   - prompt_templates 全22ルーチン×level1〜3(§3-2の声かけ文テーブルを**一字一句そのまま**)
   - 再実行安全: routine は `updateOrCreate` キー `(phase, name)`、prompt_templates は `(routine_template_id, prompt_level, sort_order)`
   - `DatabaseSeeder` から呼び出す1行を追記。

4. **API 6本**(スペック§4)。コントローラは `backend/app/Http/Controllers/Api/Koekake/` に分割
   - `GET /api/koekake/tasks`(遅延生成込み・§4-1)
   - `GET /api/koekake/tasks/{id}`(§4-2)
   - `POST /api/koekake/prompt-events`(冪等・§4-3)
   - `DELETE /api/koekake/prompt-events/{id}`(当日のみ取消・§4-4)
   - `PATCH /api/koekake/tasks/{id}/completion`(upsert・§4-5)
   - `POST /api/koekake/tasks/{id}/snooze`(排他バリデーション・§4-6)
   - ルートは `routes/api.php` にスペック§4-7の `Route::prefix('koekake')` ブロックを追記。

5. **Pest featureテスト**(`backend/tests/Feature/Api/Koekake/`・スペック§5の1〜9を網羅)

## 絶対に守ること

- **既存コードに触らない**。変更してよい既存ファイルは `routes/api.php`(追記のみ)と `DatabaseSeeder.php`(追記のみ)だけ。既存の oshigoto/mamakaji のテーブル・モデル・テスト・API には一切触れない。
- **文言(声かけ文・ラベル)はスペックの表から改変しない**。禁止表現(FR-M10・スペック§3-2末尾の7語)を含めない。
- 書き込み系は**トランザクション+サーバ集計値の返却**(スペック§4冒頭)。冪等キーで二重押下を防ぐ。
- 「当日」判定は APP_TIMEZONE(Asia/Tokyo)基準。

## 完了条件(すべて自分で実行して緑にしてから報告)

```
cd backend
php artisan migrate:fresh --seed   # 通ること(既存seed含め成功)
php artisan test                   # 新規テスト+既存テスト 全緑
./vendor/bin/pint --test           # 整形チェック緑(必要なら ./vendor/bin/pint で整形してから)
```

- 上記3つの**実行結果(件数・pass/fail)を報告に貼る**。落ちたら直してから報告。
- 実装ファイル一覧と、スペックから逸脱した点(あれば)を報告する。
- **コミット・pushはしない**(Fableがレビュー後に行う)。作業ツリーに変更を残すだけでよい。
