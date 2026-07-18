# Cursor実装依頼: K2 娘用ホーム バックエンド(PR1 `feat/musume-backend`)

あなた(Cursor composer-2.5)への実装依頼です。以下を厳密に守って実装してください。

## 読むべきスペック(唯一の正)

`docs/wip/musume-k2/musume-k2-spec.md` の **§2〜§6(バックエンド)** を実装する。
本依頼書はその要約と注意点。**スペック本文が正**。食い違いを見つけたら勝手に判断せず、
コメントで明示して止める(自分で仕様を決めない)。

既存流儀の参照元(必ず倣うこと):
- マイグレーション型・命名: `backend/database/migrations/2026_07_18_100003_create_daily_tasks_table.php`
  および `2026_07_16_100003_create_task_records_table.php`(`timestampsTz`/`timestampTz`/string長/unique/index)
- サービス/コントローラ/FormRequest/テストの構成: `backend/app/Services/Koekake/`・
  `backend/app/Http/Controllers/Api/Koekake/`・`backend/app/Http/Requests/Koekake/`・
  `backend/tests/Feature/Api/Koekake/`(K1声かけ実装。**同じ流儀で musume 版を作る**)
- 「当日」判定/タイムゾーン: `backend/app/Support/JstDate.php`(Asia/Tokyo)

## 作るもの(すべて backend/ 配下・Laravel)

### 1. マイグレーション3本(`backend/database/migrations/`・スペック§2の定義そのまま)

既存の `2026_07_18_1000xx` と衝突しない連番で作成(例: `2026_07_18_200001`〜`200003`)。
すべて `timestampsTz`・null可/デフォルト/index/unique はスペック§2の記述どおり。

- `..._create_daily_plans_table.php`(§2-1): `plan_date` は **unique**(遅延生成の衝突ガードに使う)
- `..._create_plan_items_table.php`(§2-2): `daily_plan_id` FK cascade・`index(daily_plan_id, category)`
- `..._create_reflection_sessions_table.php`(§2-3): `daily_plan_id` FK cascade・**unique**

シードは無し(daily_plans は遅延生成)。

### 2. モデル3本(`backend/app/Models/`)

- `DailyPlan` / `PlanItem` / `ReflectionSession`
- fillable・casts(date/time/tz datetime)・リレーション(`DailyPlan hasMany PlanItem`・
  `DailyPlan hasOne ReflectionSession`)を既存モデルの流儀で。

### 3. API 4本 + koekake拡張(スペック§4)

コントローラは新規 `backend/app/Http/Controllers/Api/Musume/` に分割。ドメインロジックは
`backend/app/Services/Musume/`(例: `MusumePlanService`)へ。バリデーションは
`backend/app/Http/Requests/Musume/` に FormRequest で(enum厳格・`Rule::in`)。

- **`GET /api/musume/plan?date=YYYY-MM-DD`**(§4-1・遅延生成):
  当日planが無ければ生成。`unique(plan_date)` を衝突ガードに **upsert / insertOrIgnore**(並行GET安全・
  K1 `ensureDailyTasks` と同じ流儀)。生成時の `mode` は §3 に従い **直近の過去planの mode を引き継ぐ**、
  1件も無ければ `'summer'`。応答はスペック§4-1のJSON形(plan全体・review・items をカテゴリ別配列で)。
- **`PATCH /api/musume/plan/{id}`**(§4-2・部分更新):
  `mode`/`school_start_period`/`wake_up_time`/`today_state`/`tomorrow_items_state`/`start_state` を
  enum厳格バリデーション。応答=plan全体(§4-1と同形)。
- **`PUT /api/musume/plan/{id}/items`**(§4-3・置換):
  `{category, titles[]}` でカテゴリ配下を配列順に**全置換**(空配列=クリア)。
  §3のstate連動をサーバ側で同時更新。応答=plan全体。
- **`POST /api/musume/plan/{id}/reflection/complete`**(§4-4・冪等):
  reflection_sessions を upsert(`started_at=completed_at=now`)+ `daily_plans.review_completed_at` 更新。
  再送は200・同値(冪等)。応答=plan全体。
- **`GET /api/koekake/musume-summary?date=YYYY-MM-DD`**(§4-5・母向け参照専用):
  planが無ければ**生成せず** `{"summary": null}`。あれば 3項目タイトル配列+mode+start(登校時限or起床時刻)+
  states+review_completed_at を返す。**副作用なし(生成しない)**。
- **koekake拡張 `anytime` 受理**(§4-6):
  `backend/app/Http/Requests/Koekake/KoekakeTaskIndexRequest.php` の phase バリデーション
  `Rule::in(['morning', 'evening', 'night'])` に **`'anytime'` を追加**するのみ
  (`Rule::in(['morning', 'evening', 'night', 'anytime'])`)。シード変更なし。現状は常に空配列200で返る。

ルートは `backend/routes/api.php` に追記:
- `Route::prefix('musume')` ブロックで上記4本(§4-1〜4-4)
- 既存 `Route::prefix('koekake')` ブロックに `musume-summary` の GET を1本追記

### 4. サーバ側ルール(スペック§3・厳守)

- **stateの整合はサーバが単一truth**(DR-008/010):
  - items置換(PUT items)で `today_state`/`tomorrow_items_state` を、置換後の配列が
    非空なら `'decided'`・空配列なら `'undecided'` に更新(`today_task`→today_state、
    `tomorrow_item`→tomorrow_items_state。`memo` はstate連動なし)。
  - `school_start_period` または `wake_up_time` が設定されたら `start_state='decided'`。
  - `'with_mama'` は PATCH で明示指定された場合のみ設定。
  - **応答には常に更新後の plan 全体を返す**。
- 書き込みは全て**トランザクション**。振り返り完了は**upsert冪等**(再送200・同値)。

### 5. Pest/PHPUnitテスト(`backend/tests/Feature/Api/Musume/`・スペック§5を網羅)

> 注: スペックは「Pest featureテスト」と表記しているが、**本プロジェクトに Pest は未導入**
> (composer.json は phpunit/phpunit のみ)。K1同様、**既存の PHPUnit(`extends TestCase` / `RefreshDatabase`)
> 枠組みを踏襲**して feature テストを書くこと。これは容認済みの読み替え(§5の観点を内容で満たせばよい)。

網羅する観点(§5):
- plan遅延生成: 同日2回GETで1件のみ(衝突ガード)
- mode引き継ぎ: 前日summer→当日summer / plan1件も無い初回=summer
- items置換とstate連動(非空→decided / 空→undecided)
- with_mama を PATCH で設定
- reflection complete の冪等(2回POSTで1行・review_completed_at 設定)
- musume-summary: plan有りの内容 / **plan無し=`{"summary":null}` かつ生成されない**
- anytime phase 受理: `GET /api/koekake/tasks?phase=anytime` が空配列200

### 6. 既存テストの件数更新(唯一許可される既存テスト変更)

`backend/tests/Feature/Api/OshigotoPersistenceTest.php` の
`test_custom_migrations_use_timezone_aware_timestamps` にある
`$this->assertCount(12, $migrationFiles)` を、マイグレーション3本追加後の実数
**`assertCount(15, ...)`** に更新する(件数のみ・テスト意図は変えない)。

## 絶対に守ること(スコープ・スペック§9)

- 変更してよい**既存**ファイルは次の3つだけ:
  1. `backend/app/Http/Requests/Koekake/KoekakeTaskIndexRequest.php`(anytime追加のみ)
  2. `backend/routes/api.php`(musume prefix追記 + koekake に musume-summary 追記)
  3. `backend/tests/Feature/Api/OshigotoPersistenceTest.php`(件数 12→15 のみ)
- **oshigoto / child-plan / taskRecords / mamakaji / 既存koekakeのロジック**には一切触れない。
- 名前「あきちゃん」はK2では固定文字列でよい(認証なし・単一世帯)。
- **せめない表現の原則**(FR-M10)。娘向けデータに失敗色/赤字/回数を持たせる項目を勝手に足さない。

## 完了条件(すべて自分で実行して緑にしてから報告)

```
cd backend
php artisan migrate:fresh --seed      # 既存seed含め成功すること
php artisan test                      # 新規musumeテスト+既存テスト 全緑
./vendor/bin/pint --test              # 整形チェック緑(必要なら ./vendor/bin/pint で整形してから再チェック)
```

- 上記3コマンドの**実行結果(pass/fail・テスト件数・assertion数)を報告に貼る**。落ちたら直してから報告。
- 実装ファイル一覧・スペックから逸脱した点(あれば)を報告する。
- **コミット・pushはしない**(Fable/Codexレビュー後に行う)。作業ツリーに変更を残すだけでよい。
