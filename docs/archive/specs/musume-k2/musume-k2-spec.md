# K2 実装指示書: 娘用ホーム `/musume`(バックエンド+フロント統合)

- 作成日: 2026-07-18
- 作成: Fable(計画担当)
- 参照: `docs/archive/phases/koekake-plan-01.md` §6 / 基本設計v0.2 §4(D-01〜D-05)/ DR-019 §9 / **DR-020**
- **デザインの正 = `docs/mockups/kurashi-musume-home.html`**(2026-07-18 ユーザー+娘 承認済み)。
  本書と食い違う場合、見た目・文言はモックが正、データ・APIは本書が正。

## 0. 確定事項(2026-07-18 ユーザー確認・DR-020)

1. **主役=見通し3項目**(D-01)。docx F-01の「できたこと記録」はK3へ(ポイント連動も同時期)。
2. **時間帯 `anytime`(いつでも)をK2で導入**(箱と受け口のみ。シード投入はK3の活動マスタ統合時)。
3. 夏休みモードでは3項目目を**「明日何時に起きる?」**に切替(学校モード=D-04「何時間目から登校?」)。
4. 1項目目の文言は**「いまから何する?」**。
5. 娘画面に**声かけ回数を出さない**(基本設計§15)・未完了の赤表示なし・「ママと決める」「今は決めない」常設。
6. おしごと(ハロウィン・ラリー)は**入口カードのみ**。世界観・コードとも無変更。
7. 既存 `/child-plan` はK2では触らない(統合判断はK3)。

## 1. スコープとPR分割(DR-014準拠)

| PR | ブランチ | 内容 |
|---|---|---|
| PR1 | `feat/musume-backend` | CREATE 3本+`/api/musume/*`+koekake拡張2点(§4-5/§4-6)+Pest |
| PR2 | `feat/musume-frontend` | `/musume` 画面+AppShellナビ+母側表示2点(§7-5)+vitest |

- koekake拡張(anytime受理・むすめサマリー)は別ドメインだが、**K2決定範囲かつ同一デプロイ単位のため同梱**(DR-020)。
- スコープ外(やらない): できたこと記録・ポイント連動・見通し→母タスク自動生成(FR-M14)・
  音声入力・写真メモ・時間割連携・child-plan統合・anytimeルーチンのシード。

## 2. マイグレーション(新規CREATE 3本・musumeドメイン・timestampsTz)

### 2-1. `create_daily_plans_table`

```text
id / plan_date(date) unique / mode(20, default 'school')  … school|summer|holiday|outing
school_start_period(20, null可)   … first_period|second_period|third_period|from_lunch|afternoon|decide_morning|absent|other
wake_up_time(time, null可)        … 夏休みモード用
today_state(20, default 'undecided')          … undecided|with_mama|decided
tomorrow_items_state(20, default 'undecided') … 同上
start_state(20, default 'undecided')          … 同上
review_completed_at(tz, null可)   … 表示用キャッシュ(正本は reflection_sessions)
```

### 2-2. `create_plan_items_table`

```text
id / daily_plan_id FK(cascade) / category(20) … today_task|tomorrow_item|memo
title(100) / status(20, default 'planned') / sort_order
index(daily_plan_id, category)
```

### 2-3. `create_reflection_sessions_table`

```text
id / daily_plan_id FK(cascade) unique / mode(20) … normal|summer
started_at(tz) / completed_at(tz, null可) / note(200, null可)
```

シードなし(daily_plans は遅延生成)。

## 3. サーバ側ルール

- **遅延生成**: GET時に当日planが無ければ生成。`unique(plan_date)` を衝突ガードに upsert(K1 daily_tasks と同じ流儀・並行GET安全)。
- **modeの初期値**: 直近の過去planの mode を引き継ぐ。1件も無ければ `'summer'`(2026夏リリースのため)。
- **stateの整合はサーバが単一truth**: items置換で today_state/tomorrow_items_state を `'decided'`(空配列なら `'undecided'`)へ、
  school_start_period / wake_up_time 設定で start_state を `'decided'` へ、サーバ側で同時更新。
  `'with_mama'` はPATCHで明示的に設定された場合のみ。応答には常に更新後のplan全体を返す(DR-008/010)。
- 書き込みは全てトランザクション。振り返り完了は upsert 冪等(再送200・同値)。
- 「当日」判定・タイムゾーンは既存踏襲(Asia/Tokyo)。

## 4. API

### 4-1. `GET /api/musume/plan?date=YYYY-MM-DD`

遅延生成して返す:

```json
{ "plan": { "id":1, "plan_date":"2026-07-18", "mode":"summer",
  "school_start_period":null, "wake_up_time":"07:30",
  "today_state":"decided", "tomorrow_items_state":"undecided", "start_state":"decided",
  "review": { "mode":"summer", "completed_at":"…|null" },
  "items": { "today_task":[{"id":1,"title":"夏休みの宿題","sort_order":0}], "tomorrow_item":[], "memo":[] } } }
```

### 4-2. `PATCH /api/musume/plan/{id}`

部分更新: `mode` / `school_start_period` / `wake_up_time` / `today_state` / `tomorrow_items_state` / `start_state`。
enum厳格バリデーション。応答=plan全体(4-1と同形)。

### 4-3. `PUT /api/musume/plan/{id}/items`

`{ "category":"today_task", "titles":["夏休みの宿題","遊ぶ"] }` → カテゴリ配下を配列順で**置換**(空=クリア)。
state連動は§3。応答=plan全体。

### 4-4. `POST /api/musume/plan/{id}/reflection/complete`

`{ "mode":"summer", "note":null }` → reflection_sessions upsert(started_at=completed_at=now)+
`daily_plans.review_completed_at` 更新。冪等。応答=plan全体。

### 4-5. `GET /api/koekake/musume-summary?date=YYYY-MM-DD`(母向け・参照専用)

planが無ければ**生成せず** `{"summary": null}`。あれば 3項目のタイトル配列+mode+start(登校時限or起床時刻)+
states+review_completed_at を返す。

### 4-6. koekake拡張: `anytime` 受理

`GET /api/koekake/tasks` の phase バリデーションに `anytime` を追加し、`routine_templates.phase='anytime'` を許容。
シード変更なし(現状は常に空で返る)。書き込み系は daily_task 経由のため変更不要。

## 5. バックエンド完了条件(DR-017: Pest featureテスト)

- plan遅延生成(同日2回GETで1件・並行想定の衝突ガード)/ mode引き継ぎ(前日summer→当日summer・初回summer)
- items置換とstate連動 / with_mama設定 / reflection complete冪等 / musume-summary(plan無し=null含む)
- anytime phase受理(空配列200)/ 既存テスト・pint 緑

## 6. 本番反映(PR1マージ後・ユーザー操作)

Laravel Cloud Commands: `php artisan migrate --force` のみ(シード無し・fresh不要)。

## 7. フロントエンド(PR2)

### 7-1. 構成

- `src/pages/MusumePage.tsx` + `src/features/musume/`(`api/musume.ts`・`api/schemas/musumeSchema.ts`・
  `queries.ts`・`components/`・`musume.css`)。CSS変数はモックのトークンを `--msm-*` として feature ローカルに移植
  (画面固有カラーコードの散在禁止・既存 `--osh-*` と同じ流儀)。
- AppShellナビに「むすめ」を追加(アイコン: lucide `Heart`)。
- 通信層は `features/koekake/queries.ts` の**mutation直列化+サーバ応答で確定**のパターンを踏襲(DR-010)。

### 7-2. D-01 ホーム(モック準拠)

- レース縁ヘッダー+挨拶「おかえり、あきちゃん」+日付+モード切替チップ(🌻夏休み/🏫学校 → PATCH mode)。
- 見通し3カード: ❤️いまから何する? / 🎒明日何がいる? / ⏰明日何時に起きる?(夏)⇄🕒何時間目から登校?(学校)。
  タップでボトムシート: チップ選択(複数可・「その他」は1行自由入力)+「🎀ママと決める」「今は決めない」常設+「これにする!」。
  - いまから何する?: 夏=夏休みの宿題/自由研究/遊ぶ/休む/入浴/その他、学校=宿題/テスト勉強/学校の課題/遊ぶ/休む/入浴/その他(D-02)
  - 明日何がいる?: 夏=水筒/ぼうし/宿題/財布/ハンカチ/その他、学校=宿題/水筒/体操服/エプロン/提出プリント/財布/定期入れ/ハンカチ(D-03)
  - 起床時刻(夏・単一選択): 7:00/7:30/8:00/8:30/9:00よりあと、登校時限(学校・単一選択): D-04の8択
- 決定内容はカードのans行にローズ色で表示(モック準拠)。

### 7-3. D-05 振り返りシート

チェック5行(夏=外出/学習/休憩/必要な物/起きる時刻、通常=できたこと/手伝ってもらったこと/困ったこと/明日に回すこと/明日の予定)
+「確認おわり!」→ POST complete → 「ママに『確認完了』が届いたよ 🎀」+カードに「できた🎀」バッジ。

### 7-4. おしごと入口・メモ

- 夜グラデの入口カード(モック準拠)→ `/oshigoto` へ Link。おしごと側は無変更。
- メモカード: category='memo' の plan_items へ保存(PUT items)。

### 7-5. 母側(KoekakePage への追記2点のみ)

1. 「むすめの見通し」カード: `musume-summary` を表示(3項目+起床/登校+振り返り完了バッジ。null時は「まだ決めてないよ」の中立表示)。
2. 「いつでも」タブ: `tasks?phase=anytime` を並行取得し、**タスクが1件以上ある日のみ**4番目のタブとして表示
   (現状シード無し=非表示のまま。K3でルーチンが増えると自動で現れる)。

### 7-6. 表示原則

声かけ回数を出さない・赤字/失敗色なし・「今は決めない」を選んでも中立表示。文言は漢字混じり(全ひらがな禁止)・モックの文言が正。

## 8. フロント完了条件(DR-017: vitest+fetchモック・MSW不使用)

- plan取得と3カード表示 / チップ保存(PUT items→サーバ応答で確定)/ ママと決める(PATCH state)
- モード切替で3項目目とチップ・振り返り項目が切替 / 振り返りcomplete→バッジ
- 母側: musume-summary表示・null時の中立表示・anytimeタブの出し分け(0件=非表示/1件以上=表示)
- lint / typecheck / test / build 緑(buildのWindowsネイティブクラッシュは既知の環境要因。Render Linux CIが本番ゲート)

## 9. 実装注意(共通)

- 既存コードの変更は §4-6(バリデーション1点)と §7-5(KoekakePage追記)のみ。oshigoto・child-plan・
  taskRecords には一切触らない。
- 名前「あきちゃん」はK2では固定文字列でよい(認証なし・単一世帯。family_members連携はK3)。
- レビュー観点: せめない表現(FR-M10禁止表現ゼロ)・声かけ回数の娘画面非表示・DR-010(直列化・サーバ値正)。
