# くらしのおしごと/ママの家事手帖 永続化バックエンド 実装スペック(Phase 3-4)

対象: `backend/` のみ。**frontend/ には一切触れない。**
親指示書: `docs/deploy_change/kurashi-relay_laravel-cloud_deployment_instructions.md`(Phase 3〜4に相当)
最初に `AGENTS.md` を読むこと。

## 0. 作業手順の厳守事項

1. **ブランチ `feature/oshigoto-persistence-api` 上で作業する**(既にチェックアウト済みのはず。`git branch --show-current` で確認し、違えば切り替える。mainへ直接コミットしない)。
2. 論理単位ごとにConventional Commitsでコミットする(例: `feat(api): add task record tables and migrations`)。**pushはしない。**
3. 既存の `GET /api/health` `GET /api/dashboard` の実装・テストを変更しない(壊さない)。
4. 破壊的マイグレーション禁止(drop/alter既存テーブルなし。そもそも既存テーブルは無い=全て新規create)。
5. 新規composerパッケージを追加しない(Laravel 12標準のみで実装可能)。
6. `.env` をコミットしない。実URLをコードに書かない。
7. 完了時に本ファイル末尾の報告フォーマットで報告する。

## 1. 背景(実装の意図)

現在フロントの「くらしのおしごと」(娘)と「ママの家事手帖」(母)はモック定数+useStateのみで、更新で消える。これをDB永続化する。フロント側の対応(Phase 5)は別途行うため、**今回はAPIとDBのみ**。

フロントの現行ロジック(`frontend/src/features/oshigoto/data.ts`, `frontend/src/features/mamakaji/data.ts` 参照。読むだけ・変更禁止):

- 両者とも「タスク完了1回 = ゲージ+1」。ゲージは累積式(毎日リセットしない)、10個で満タン。
- 娘: 満月(10個)到達ごとにゾンビを1体獲得(図鑑コレクション)+ コイン100(`COIN_PER_FULL_MOON`)。
- 母: 家事1回 = 10ポイント(`POINT_PER_STAMP=100 / STAMP_SIZE=10`)。びん満タン(10個)ごとにお菓子を1つ獲得。
- タスクはトグル式(完了⇔取り消し)。

本番はLaravel Cloud + Serverless Postgres(pgsql)。テストはsqlite :memory:。**MySQLは対象外**(partial indexの使用可)。

## 2. DBスキーマ(マイグレーション新規作成)

日時カラムは全て `timestampTz`(UTC保存)。`record_date`/`obtained_on` は `date` 型で**日本時間の日付**を意味する。

### 2.1 `family_members`

| カラム | 型 | 制約 |
|---|---|---|
| id | id() | PK |
| role | string(20) | UNIQUE。値: `mother` / `child` |
| display_name | string(50) | |
| timestamps | | |

### 2.2 `task_definitions`

| カラム | 型 | 制約 |
|---|---|---|
| id | id() | PK |
| owner_role | string(20) | index。`mother` / `child` |
| slug | string(50) | フロントのタスクid(`kigae`等)。UNIQUE(owner_role, slug) |
| category | string(30) nullable | |
| title | string(100) | |
| point_value | unsignedSmallInteger default 0 | 完了1回あたりの獲得ポイント(母=10、娘=0) |
| is_active | boolean default true | |
| sort_order | unsignedSmallInteger default 0 | |
| timestamps | | |

### 2.3 `task_records`(完了イベント。取消は論理取消)

| カラム | 型 | 制約 |
|---|---|---|
| id | id() | PK |
| family_member_id | foreignId | FK(family_members) |
| task_definition_id | foreignId | FK(task_definitions) |
| record_date | date | JSTの日付 |
| completed_at | timestampTz | 完了時刻(UTC) |
| cancelled_at | timestampTz nullable | 論理取消時刻。nullなら有効 |
| source | string(20) default 'web' | |
| idempotency_key | string(64) | **UNIQUE** |
| timestamps | | |

追加index: `(family_member_id, record_date)`。

**部分ユニークインデックス(必須・二重登録のDBレベル防止):**

```php
DB::statement(
  'CREATE UNIQUE INDEX task_records_active_unique
   ON task_records (family_member_id, task_definition_id, record_date)
   WHERE cancelled_at IS NULL'
);
```

pgsql/sqlite両対応の構文。downでは `DROP INDEX IF EXISTS`(pgsql)/sqlite両方で動く形にする。

### 2.4 `reward_collections`(獲得コレクション。**追記専用・取消でも削除しない**)

| カラム | 型 | 制約 |
|---|---|---|
| id | id() | PK |
| family_member_id | foreignId | FK |
| type | string(20) | `zombie` / `sweet` |
| item_slug | string(50) | 例 `vampire`, `macaron` |
| milestone_number | unsignedInteger | 何回目の満タンか。**UNIQUE(family_member_id, milestone_number)** |
| obtained_on | date | JST日付 |
| task_record_id | foreignId nullable | 到達契機のレコード |
| timestamps | | |

### 2.5 `reward_adjustments`(初期持ち越し・手動補正。追記専用)

| カラム | 型 | 制約 |
|---|---|---|
| id | id() | PK |
| family_member_id | foreignId | FK |
| kind | string(20) | `gauge` / `coin` / `point` |
| amount | integer | 符号付き |
| reason | string(200) | |
| timestamps | | |

## 3. 集計ルール(単一のServiceクラスに集約。残高カラムは持たない=履歴から導出)

有効レコード = `cancelled_at IS NULL` の task_records。

- `lifetime_count(member)` = 有効レコード数 + Σ adjustments(kind=gauge).amount
- `gauge_count` = lifetime_count % 10、`full_count` = floor(lifetime_count / 10)
- 娘 `coins` = full_count × 100 + Σ adjustments(kind=coin).amount
- 母 `points` = Σ(有効レコードの task_definition.point_value) + Σ adjustments(kind=point).amount
- `today_done_count` = 指定日の有効レコード数

定数(10, 100)は `config/kurashi.php` に置く(`stamp_size`, `coin_per_full_moon`)。

## 4. ごほうび付与(満タン到達)

POST処理のトランザクション内で:

1. `family_members` の対象行を `lockForUpdate()`(メンバー単位の直列化)。
2. レコード挿入後の `lifetime_count` が10の倍数に**ちょうど到達**した場合、`milestone_number = lifetime_count / 10` で `reward_collections` を作成。
   - type: child→`zombie` / mother→`sweet`。item_slug は `config/kurashi.php` のカタログから無作為に選ぶ。
   - カタログ: zombie = `pierrot, exec, prisoner, testsub, doll, vampire, demon` / sweet = `lamington, macaron, pannacotta, mooncake`(フロントのdata.tsと同一slug)。
3. **UNIQUE(family_member_id, milestone_number) により、取消→再完了で同じ節目を再通過しても二重付与されない**(unique違反時は付与スキップして続行)。これが「トグル連打・取消再完了でのごほうび二重加算防止」の要。
4. 付与した場合のみレスポンスに `revealed_reward` を含める。

## 5. API契約

共通: 成功 `{"status":"success","data":{...},"meta":{"timezone":"Asia/Tokyo"}}` / エラー `{"status":"error","message":"...","errors":{}}`(既存 `api-contract-01.md` と同形)。バリデーションエラーは422。日時はISO 8601オフセット付き。

### 5.1 `GET /api/tasks?member=child&date=2026-07-16`

- `member`: 必須。`mother`|`child`。不正は422。
- `date`: 任意。`Y-m-d`。省略時は**JSTの今日**。未来日(JST基準で明日以降)は422。
- data: `{ "date": "...", "member": "child", "tasks": [ { "slug","title","category","point_value","sort_order","done":bool,"record_id":int|null } ], "summary": {…§5.4} }`
- tasksは該当roleの `is_active=true` を sort_order 順に。`done` は指定日の有効レコード有無。

### 5.2 `POST /api/task-records`

リクエスト:

```json
{ "member": "child", "task": "shokki", "date": "2026-07-16", "idempotency_key": "uuid文字列", "source": "web" }
```

- `member` 必須(mother|child)。`task` 必須(該当roleの有効slugであること。不正422)。
- `date` 任意(省略時JST今日。未来日422。31日以上過去は422)。
- `idempotency_key` 必須 string 8〜64。`source` 任意(既定 `web`)。

処理(全体を `DB::transaction`、member行 `lockForUpdate`):

1. **同一 `idempotency_key` の既存レコードがあれば挿入せず**、その既存レコードで200を返す(再送安全)。ただし既存レコードと member/task/date が食い違う場合は409。
2. 同一 member×task×date の**有効**レコードが既にある場合(別キーでの再送・二端末競合)、挿入せず既存レコードで200(部分ユニークインデックス違反を捕捉するか事前SELECTで判定。**エラーにしない**)。
3. 新規挿入 → §4のごほうび判定 → 201。

レスポンス(201/200共通形):

```json
{ "status": "success",
  "data": {
    "record": { "id":1, "member":"child", "task":"shokki", "record_date":"2026-07-16", "completed_at":"2026-07-16T19:30:00+09:00", "cancelled_at":null },
    "summary": { …§5.4 },
    "revealed_reward": { "type":"zombie", "item_slug":"vampire", "milestone_number":2, "obtained_on":"2026-07-16" }
  },
  "meta": { "timezone":"Asia/Tokyo", "deduplicated": false }
}
```

- `revealed_reward` は付与時のみ非null。**同一キー再送では同じ reward を返す**(task_record_id から引く)。
- 再送・重複で既存を返した場合 `meta.deduplicated: true`。

### 5.3 `DELETE /api/task-records/{id}`

- 論理取消: `cancelled_at` を現在時刻に設定。物理削除しない。
- 既に取消済みなら何もせず200(冪等)。存在しないidは404(JSON)。
- レスポンス: `data: { record, summary }`。
- **reward_collectionsは削除しない**(獲得済みコレクションの扱いは仕様確認前のため現状維持=残す。指示書§Phase4の方針)。

### 5.4 `GET /api/rewards/summary?member=child` / summary共通形

```json
{ "member":"child", "date":"2026-07-16", "today_done_count":3,
  "lifetime_count":16, "gauge_count":6, "gauge_size":10, "full_count":1,
  "coins":100, "points":null, "collections_count":1 }
```

- 母は `coins:null` / `points:数値`。娘はその逆。

### 5.5 `GET /api/rewards/collections?member=child`

- data: `{ "member":"child", "collections": [ { "type","item_slug","milestone_number","obtained_on" } ] }`(obtained_on昇順)。

## 6. 実装構造(AGENTS.mdの規約どおり)

- ルート: `routes/api.php` に追記(既存2ルートは触らない)。
- Controller薄く: `Api/TaskController`(index)、`Api/TaskRecordController`(store, destroy)、`Api/RewardController`(summary, collections)。
- 入力検証は FormRequest。レスポンス整形は API Resource。
- 集計・付与ロジックは `app/Services/`(例 `TaskRecordService`, `RewardCalculator`)。Controllerに業務ロジックを書かない。
- Eloquentモデル: FamilyMember, TaskDefinition, TaskRecord, RewardCollection, RewardAdjustment(リレーション定義)。
- タイムゾーン: `config/app.php` の timezone は `UTC` のまま。JST判定は `Asia/Tokyo` を明示指定(例 `now('Asia/Tokyo')->toDateString()`)。日付のみ値と日時値を混同しない。

## 7. シーダー(再実行安全=updateOrCreateで冪等。本番実行可能な内容のみ)

- family_members: `mother`/「ママ」、`child`/「むすめ」(実名は入れない)。
- task_definitions: フロント `data.ts` と同一slug・同ラベル。
  - child(point_value=0): kigae/自分で着替えた, fuku/脱いだ服をかごに入れた, shokki/食器を流しに運んだ, kaban/カバンを棚に置いた, suito/水筒を流しに出した
  - mother(point_value=10): shokki/食器を洗った, sentaku/洗濯を回して干した, nanashi/名もなき家事をやった, soji/床に掃除機をかけた, yuhan/夕飯を作った
  - sort_orderはこの並び順。
- reward_adjustments のシードは**入れない**(実端末の現在値はユーザー確認後に別途投入)。
- DatabaseSeederから呼ぶ。`php artisan db:seed --force` を複数回実行しても増殖しないこと。

## 8. テスト(Feature中心。sqlite :memory: + RefreshDatabase)

`phpunit.xml` のコメントアウトされた `DB_CONNECTION=sqlite` / `DB_DATABASE=:memory:` を有効化する。時刻依存は `Carbon::setTestNow` で固定。最低限:

1. POSTで記録作成: gauge+1、母はpoints+10になる(summary検証)。
2. **同一idempotency_key再送**: 200、行が増えない、同じrecord.id、`revealed_reward`も同一。
3. 同一member×task×dateを**別キー**でPOST: 行が増えず200 + deduplicated。
4. idempotency_key一致でpayload不一致: 409。
5. DELETEで論理取消: summary減算。再DELETEは冪等200。
6. 取消後に同日再完了(新キー): 新規行が作れる(部分ユニークインデックスと共存)。
7. **10個目到達でreward_collections付与**+milestone_number=1。取消→再完了で同じ節目を再通過しても**2つ目が付与されない**。
8. 10個目POSTの再送で同じrevealed_rewardが返る。
9. GET /api/tasks: done反映、member不正422、未来日422。
10. **JST日付境界**: UTC 15:30(=JST翌日00:30)にPOSTした場合、date省略時のrecord_dateがJSTの翌日になる。
11. 存在しないtask slug: 422。存在しないrecord id DELETE: 404 JSON。
12. 既存 health/dashboard テストが全て緑のまま。

## 9. 品質確認(全て通してから完了報告)

```bash
cd backend
php artisan test
./vendor/bin/pint --test   # pintが無い場合は composer.json を確認し、無ければ報告のみ(勝手に追加しない)
```

frontend側のコマンドは実行不要(触っていないことが前提)。

## 10. 完了報告フォーマット

```markdown
## 実施した作業
## 変更したファイル
## テスト結果(php artisan test / pint)
## 未完了・要確認
## 設計上の判断(あれば)
```
