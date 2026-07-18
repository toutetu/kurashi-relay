# Codexレビュー依頼: K2 娘用ホーム バックエンド(PR1)

あなた(Codex)はコードレビュー/品質ゲート検証担当です。Cursorが実装した K2 バックエンドを
**独立レビュー**し、品質ゲートを**自分で再実行**して合否を報告してください。コミット・pushはしない(レポートのみ)。

## 対象

- ブランチ: `feat/musume-backend`(未コミット。作業ツリーの変更が対象)
- スペック(唯一の正): `docs/wip/musume-k2/musume-k2-spec.md` の §2〜§6
- Cursor実装依頼書: `docs/wip/musume-k2/cursor-request-backend.md`(要約と制約)
- 新規ファイル: `backend/app/Http/Controllers/Api/Musume/`・`.../Api/Koekake/MusumeSummaryController.php`・
  `backend/app/Services/Musume/`・`backend/app/Http/Requests/Musume/`・`backend/app/Models/{DailyPlan,PlanItem,ReflectionSession}.php`・
  `backend/database/migrations/2026_07_18_2000{01,02,03}_*.php`・`backend/tests/Feature/Api/Musume/MusumePlanTest.php`
- 既存変更(許可3件): `KoekakeTaskIndexRequest.php`(anytime追加)・`routes/api.php`・`OshigotoPersistenceTest.php`(件数12→15)

## やること

### 1. 品質ゲートの再実行(必ず自分で実行し件数付きで結果を貼る)

```
cd backend
php artisan migrate:fresh --seed
php artisan test
./vendor/bin/pint --test
```

各コマンドの pass/fail・テスト件数・assertion数を報告に貼る。落ちたら原因を特定して報告
(直すかはFableが判断。勝手に大改修しない。1〜数行の明白なバグ修正は可)。

### 2. スペック適合レビュー(重点・§3〜§4)

- **API契約 §4**: エンドポイント/HTTPメソッド/リクエスト・レスポンス項目/ステータスコード。特に:
  - `GET /api/musume/plan` の**遅延生成が並行安全**か。`unique(plan_date)` を衝突ガードに upsert/insertOrIgnore で
    二重生成しないか(同日2回GETで1件)。生成時 `mode` が直近過去planを引き継ぎ、無ければ `'summer'`。
  - `PATCH /api/musume/plan/{id}` が enum厳格バリデーション、応答=plan全体(§4-1同形)。
  - `PUT /api/musume/plan/{id}/items` がカテゴリ配下を**配列順で全置換**・空配列=クリア。
  - `POST /api/musume/plan/{id}/reflection/complete` が **upsert冪等**(2回POSTで1行・review_completed_at更新・再送200同値)。
  - `GET /api/koekake/musume-summary` が plan無し時に**生成せず** `{"summary":null}`。副作用なし。
- **§3 stateの単一truth(DR-008/010)**:
  - items置換で `today_state`/`tomorrow_items_state` が 非空→`decided` / 空→`undecided` に**サーバ側で**更新されるか。
  - `school_start_period` または `wake_up_time` 設定で `start_state='decided'`。
  - `'with_mama'` は PATCH明示時のみ。
  - **書き込み系が全てトランザクション**で、応答に常に**更新後のplan全体**を返すか。
- **タイムゾーン**: 「当日」判定が JstDate(Asia/Tokyo)基準か。

### 3. スコープ / 既存への影響(§9)

- 変更された既存ファイルが**許可3件のみ**(KoekakeTaskIndexRequest / routes/api.php / OshigotoPersistenceTest)であること。
  **oshigoto / child-plan / taskRecords / mamakaji / 既存koekakeロジック**に実質変更が無いこと。
- `KoekakeTaskIndexRequest` の変更が `Rule::in([...,'anytime'])` の1点のみか。`GET /api/koekake/tasks?phase=anytime` が
  空配列200で返るか(既存koekakeの挙動を壊していないか)。
- Cursorが `tests/Unit/.gitkeep` を新規追加している(phpunit.xml が参照する tests/Unit 欠如の補填)。
  これが**妥当な補填**か、既存テスト実行に副作用が無いかを確認。

### 4. Cursorの補足判断3点の妥当性

1. `musume-summary` のJSONスキーマ(§4-5に具体形が無く、Cursorが `{summary:{mode, today_tasks, tomorrow_items,
   wake_up_time, school_start_period, states..., review_completed_at}}` で実装)がスペック§4-5の要求
   (3項目タイトル配列+mode+start+states+review_completed_at)を**満たすか**。
2. `PUT items` の `titles` バリデーションを `present|array`(空配列許可)にした判断の妥当性。
3. 上記 `tests/Unit/.gitkeep`。

### 5. せめない設計(FR-M10・DR-019)

- 娘向けデータ(daily_plans/plan_items)に失敗色・赤字・**声かけ回数**などの「せめる」項目が
  バックエンドで混入していないこと(K2娘画面は回数非表示が原則)。

## 報告フォーマット

1. ゲート3種の実行結果(件数付き)
2. 重大(マージ前に直すべき) / 軽微(後で可) / 指摘なし の3分類で所見
3. スコープ逸脱の有無・Cursor補足判断の可否
4. **マージ可否の総合判断**

コミット・pushはしない。レポートのみ。
