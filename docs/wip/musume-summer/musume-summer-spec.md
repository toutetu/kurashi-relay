# スペック: 夏休み「明日なにする?」追加 と 決定状態モデルの作り直し

対象画面: `/musume`(娘用ホーム) と `/koekake`(母用むすめサマリー)
前提: **まだ実運用開始前。DBはゼロにして作り直してよい**(ユーザー確認済み・DR-013の方針)。

このスペックは**バックエンドPR → フロントPR**の2本立てで実装する(DR-014)。
§2〜§5 がバックエンド、§6〜§8 がフロント、§9 が両方の完了条件。

---

## 1. 背景と決定(詳細は DR-021)

### 1-1. 「ママと決める」→「ママと決めた」

運用が変わった。娘が決めかねたときは**ママが聞き取ってその場で一緒に決め、ママが代理入力する**。
つまり「これから決める(先送り)」ではなく「**もう決まった。ママと一緒に決めた**」になる。

これによりデータの意味が変わる:

| | 旧「ママと決める」 | 新「ママと決めた」 |
|---|---|---|
| 決定状態 | 未決定の一種(`with_mama`) | **決定済み** |
| 持つ情報 | 保留フラグ | **決め方(誰と決めたか)** |

`with_mama` は `undecided` / `decided` と**並ぶ状態ではなくなり**、決定済みに付随する**属性**になる。

### 1-2. `*_state` カラムを廃止する

現状 `daily_plans` は質問カード1枚につき1カラム(`today_state` / `tomorrow_items_state` /
`start_state`)を持つ。**カードを増やすたびにスキーマが変わり、将来の項目追加・変更が詰む**。

しかも現状の `*_state` は固有情報をほぼ持っていない。`MusumePlanService::replaceItems()` が
`$titles === [] ? 'undecided' : 'decided'` と**項目の有無をそのまま書き写している**だけで、
独自の値を取るのは `with_mama` のときだけ。その `with_mama` が §1-1 で消える。
また「今は決めない」は現状**何も保存していない**ため、`undecided` と未タッチの区別も元々存在しない。

→ **決定状態は導出値にし、カラムを廃止する。決め方だけを属性として持つ。**

差し引きでカラムは1本減る。以後、質問カードを何枚増やしても `plan_items` の**行**が増えるだけで、
**カラムは増えない**。

---

## 2. スキーマ変更(既存CREATEマイグレーションを編集する)

DR-013 に従い、**新規マイグレーションを足さず既存の CREATE を書き換える**。DBは破棄・再作成する。

### 2-1. `daily_plans`(`2026_07_18_200001_create_daily_plans_table.php`)

```diff
- $table->string('today_state', 20)->default('undecided');
- $table->string('tomorrow_items_state', 20)->default('undecided');
- $table->string('start_state', 20)->default('undecided');
+ $table->string('start_decided_with', 10)->nullable();
```

`start_decided_with` は「明日 何時に起きる? / 何時間目から登校?」用。
この設問だけ値が `plan_items` ではなく `wake_up_time` / `school_start_period` という
**スカラ列**に入るため、ここだけ専用カラムが要る。設問数に比例して増える列ではない。

### 2-2. `plan_items`(`2026_07_18_200002_create_plan_items_table.php`)

```diff
  $table->string('status', 20)->default('planned');
+ $table->string('decided_with', 10)->nullable();
  $table->unsignedSmallInteger('sort_order')->default(0);
```

- 値は `'mama'` または `null`(= 娘が自分で決めた)。
- `category` カラムは `string(20)` のままで**変更不要**。新カテゴリ `tomorrow_plan` は
  値が増えるだけで、DBの変更を伴わない。

### 2-3. モデル

`app/Models/DailyPlan.php` の `$fillable` から `today_state` / `tomorrow_items_state` /
`start_state` を除き、`start_decided_with` を足す。
`app/Models/PlanItem.php` の `$fillable` に `decided_with` を足す。

---

## 3. 決定状態の導出ルール(サーバ・フロント共通)

カラムを持たない代わりに、**常に次の規則で導出する**。サーバは導出結果をレスポンスに含めない
(フロントが同じ規則で判定する)。判定に使うのは値そのものだけ。

| カード | 決定済みの条件 |
|---|---|
| いまから何する? | `items.today_task` が1件以上 |
| 明日なにする?(夏のみ) | `items.tomorrow_plan` が1件以上 |
| 明日 何がいる? | `items.tomorrow_item` が1件以上 |
| 明日 何時に起きる?(夏) | `wake_up_time` が非null |
| 何時間目から登校?(学校) | `school_start_period` が非null |

「今は決めない」は**保存せず閉じる**(現状どおり・未決定のまま)。

---

## 4. API変更

### 4-1. `PUT /api/musume/plan/{id}/items`

`app/Http/Requests/Musume/ReplacePlanItemsRequest.php`:

```php
'category' => ['required', 'string', Rule::in(['today_task', 'tomorrow_plan', 'tomorrow_item', 'memo'])],
'titles'   => [...既存のまま...],
'decided_with' => ['nullable', 'string', Rule::in(['mama'])],
```

`MusumePlanService::replaceItems()`:

- シグネチャに `?string $decidedWith = null` を追加。
- 生成する `PlanItem` 全行に `'decided_with' => $decidedWith` を入れる
  (同一カテゴリの行は必ず同じ値になる。カテゴリ単位で delete → 再作成する既存実装のまま)。
- **`today_state` / `tomorrow_items_state` を更新している if/elseif ブロックを削除する**
  (§1-2のとおり、この処理こそが廃止対象)。
- `titles` が空配列のときは全行削除。`decided_with` も自然に消える。

### 4-2. `PATCH /api/musume/plan/{id}`

`app/Http/Requests/Musume/UpdatePlanRequest.php`:

```diff
- 'today_state'          => [... Rule::in(['undecided','with_mama','decided'])],
- 'tomorrow_items_state' => [...],
- 'start_state'          => [...],
+ 'start_decided_with'   => ['sometimes', 'nullable', 'string', Rule::in(['mama'])],
```

`mode` / `wake_up_time` / `school_start_period` の扱いは**現状のまま変更しない**。
`start_decided_with` は `wake_up_time`(または `school_start_period`)と**同じリクエストで同時に**
送られてくる。

### 4-3. レスポンス形

`MusumePlanService::formatPlanResponse()`:

```diff
  'mode' => ...,
  'wake_up_time' => ...,
  'school_start_period' => ...,
- 'today_state' => ...,
- 'tomorrow_items_state' => ...,
- 'start_state' => ...,
+ 'start_decided_with' => $plan->start_decided_with,
  'items' => [
    'today_task'    => [...],
+   'tomorrow_plan' => [...],
    'tomorrow_item' => [...],
    'memo'          => [...],
  ],
```

各 item の要素に **`decided_with` を含める**(既存の `id` / `title` / `status` / `sort_order` に追加)。

### 4-4. 母用サマリー `getSummary()`

`*_state` 3つを削除し、次を追加する:

```php
'tomorrow_plans' => [...],   // tomorrow_plan の title 配列(today_tasks と同じ作り)
'decided_with' => [
    'today'         => /* today_task 先頭行の decided_with */,
    'tomorrow_plan' => /* 同上 */,
    'tomorrow_item' => /* 同上 */,
    'start'         => $plan->start_decided_with,
],
```

`decided_with` を**ネストした1オブジェクトにまとめる**のは、カードが増えたときに
レスポンスのキーが増えるだけで済ませるため(トップレベルに `*_decided_with` を並べない)。
各カテゴリの値は行ごとに同じなので**先頭行の値**を採る。行が無ければ `null`。

---

## 5. バックエンドのテスト(Pest feature・DR-017)

`backend/tests/Feature/` の既存 musume テストを改修し、最低限これを緑にする:

1. `PUT items` に `category='tomorrow_plan'` を保存でき、`GET plan` で読み戻せる。
2. `PUT items` に `decided_with='mama'` を渡すと全行に入り、レスポンスの各 item に現れる。
   省略時は `null`。
3. `PUT items` に `titles: []` を渡すとそのカテゴリが空になる。
4. `PATCH` で `wake_up_time` と `start_decided_with` を同時更新できる。
5. `GET /api/koekake/musume-summary` が `tomorrow_plans` と `decided_with` の4キーを返す。
6. **`*_state` を送る旧リクエストが422で弾かれる**(カラム廃止が効いていること)。

既存テストのうち `*_state` を参照しているものは、上記の導出ルール(§3)に沿って書き換える。

---

## 6. フロント: 新カード「明日なにする?」(夏休みモードのみ)

### 6-1. 配置

夏休みモード(`plan.mode === 'summer'`)のときだけ、**「🎒 明日 何がいる?」の直上**に挿入する。
学校モードでは表示しない。

```
夏休み:  ❤️ いまから何する?
         🔮 明日 なにする?        ← 新規
         🎒 明日 何がいる?
         ⏰ 明日 何時に起きる?

学校:    ❤️ いまから何する?
         🎒 明日 何がいる?
         🕒 何時間目から登校?
```

アイコン `🔮` はFableのデザイン判断(紫ゴスロリの世界観に合わせた「明日を見通す」メタファー)。
変更したくなったらここだけ差し替えればよい。

### 6-2. 選択肢(`frontend/src/features/musume/utils.ts`)

```ts
export const SUMMER_TOMORROW_PLAN_CHIPS = [
  "友達と遊ぶ",
  "ゆっくりする",
  "ママとお出かけ",
  "塾に行く",
  "宿題・勉強をする",
  "その他",
] as const;
```

- **複数選択可**(他のカードと同じ作法)。
- 「その他」は既存の `splitOtherTitle` + `msm-other-input`(1行自由入力)がそのまま効く。
  **新しい仕組みを作らないこと。**
- `OutlookSheetKind` に `"tomorrow_plan"` を追加し、`getPresetChips` / `getInitialSelected` /
  `buildInitialSelection` / タイトル・ヒント文言の分岐に足す。
  - タイトル: `🔮 明日 なにする?`
  - ヒント: `いくつ選んでもOK。あとから変えてもOK。`

---

## 7. フロント: 「ママと決めた」ボタン

### 7-1. ボトムシート下部のボタン(全カード共通)

現状の3ボタンを、意味を変えて次のようにする:

| ボタン | 挙動 |
|---|---|
| `これにする!` | 選択内容を保存。`decided_with` は**送らない**(= `null`) |
| `🎀 ママと決めた` | **選択内容を保存**し、`decided_with: 'mama'` を付ける |
| `今は決めない` | 保存せず閉じる(**現状のまま変更なし**) |

**重要**: 「🎀 ママと決めた」は現状の `onWithMama`(`PATCH` で state だけ書く)とは別物になる。
保存する中身は `これにする!` と**完全に同じ**で、違いは `decided_with` だけ。
`handleSave` に `decidedWith: 'mama' | null` を引数で渡す形に整理し、**保存処理を2本に分岐させない**。

- 「起きる時刻 / 登校時限」カードでは `PATCH` に `start_decided_with: 'mama'` を載せる
  (`wake_up_time` などと同時送信)。
- 選択が空のまま「ママと決めた」を押した場合は `これにする!` と同じく**クリア**として扱う。

### 7-2. 決定内容の表示

- 決定済み判定は §3 の導出ルールで行う。**`plan.*_state` への参照を全て削除する**。
- `decided_with === 'mama'` のカードは、ans行の末尾に `🎀` を添える(例: `水筒・ぼうし 🎀`)。
- 母用 `KoekakeMusumeSummaryCard.tsx` も同様に、`summary.decided_with.*` を見て
  「ママと決めた」ことが分かる表示にする。現状の `WITH_MAMA_LABEL`(未決定扱いの文言)は
  **意味が逆になるので必ず書き換える**。決定内容を消して置き換えるのではなく、
  **内容を出したうえで** 🎀 を添えること。
- サマリーに「明日なにする?」(`tomorrow_plans`)の行を追加する(夏休みモードのときのみ)。

### 7-3. 型・通信層

- `api/schemas/musumeSchema.ts`: カテゴリ enum に `tomorrow_plan` を追加、
  `planItemSchema` に `decided_with: z.enum(['mama']).nullable()`、
  plan から `*_state` を削除し `start_decided_with` を追加。summary も §4-4 に合わせる。
- 通信は既存どおり**楽観更新せずサーバの返す plan 全体で上書き**(DR-008 / DR-010)。

---

## 8. フロントのテスト(vitest・DR-017)

既存慣習(`vi.fn` の fetch モック)に従い、`MusumePage.test.tsx` / `queries.test.tsx` を改修:

1. 夏休みモードで「明日 なにする?」カードが「明日 何がいる?」**より上**に表示される。
2. **学校モードでは「明日 なにする?」カードが表示されない**。
3. チップを選んで `これにする!` → `PUT items` の body が
   `{category:'tomorrow_plan', titles:[...]}` で `decided_with` を含まない。
4. チップを選んで `🎀 ママと決めた` → 同じ body に `decided_with:'mama'` が付く。
5. `decided_with:'mama'` の項目があるカードに `🎀` が表示される。
6. `今は決めない` を押しても fetch が呼ばれない。

---

## 9. 完了条件(両PR共通)

- backend: `php artisan test`(Pest)が全緑。`vendor/bin/pint` 適用済み。
- frontend: `npm run typecheck` / `npm run build` / `npm test -- --run` が全緑。
- **`today_state` / `tomorrow_items_state` / `start_state` の文字列がリポジトリ全体から消えている**
  (`git grep` で0件。docs/archive とこのスペックは除く)。
- DBは破棄・再作成して `migrate:fresh --seed` が通る。

## 10. 厳守事項

- **新規マイグレーションを作らない**(既存CREATEを編集する。DR-013)。
- おしごと・ままかじ・声かけリマインダーの既存機能に手を入れない
  (`KoekakeMusumeSummaryCard.tsx` のむすめサマリー部分だけは §7-2 のとおり変更する)。
- 新しいnpmパッケージ・composerパッケージを追加しない。
- 認証・アクセス保護は今回も入れない(DR-007)。
- `git commit` / `git push` はしない(Fableが行う)。
