# Cursor実装依頼: K2 娘用ホーム フロントエンド(PR2 `feat/musume-frontend`)

あなた(Cursor composer-2.5)への実装依頼です。以下を厳密に守って実装してください。

## 正とするもの

1. **スペック(データ・API・完了条件の正)**: `docs/wip/musume-k2/musume-k2-spec.md` の **§7〜§8**。
2. **デザインの正**: `docs/mockups/kurashi-musume-home.html`(ユーザー+娘 承認済みモック)。
   色トークン・文言・カード構成・レイアウトを**そのまま移植**する。見た目・文言はモックが正、
   データ・APIはスペックが正。食い違いは勝手に判断せずコメントで明示して止める。
3. **musume-summary のJSON形はスペックでなくバックエンド実装が正**。
   `backend/app/Services/Musume/MusumePlanService.php` の `getSummary()`(および
   `backend/app/Http/Controllers/Api/Koekake/MusumeSummaryController.php`)を**必ず読んで**から型を書くこと。
   実形(確認済み): `{ summary: null }` または
   `{ summary: { mode, today_tasks: string[], tomorrow_items: string[], wake_up_time, school_start_period, today_state, tomorrow_items_state, start_state, review_completed_at } }`
4. plan系APIのレスポンス形もバックエンド実装が正(`MusumePlanService.php` の `formatPlanResponse()` を読む)。
   `GET/PATCH /api/musume/plan` / `PUT .../items` / `POST .../reflection/complete` は**常にplan全体**を返す。

## 作るもの(frontend/ 配下・React + TypeScript)

### 1. 構成(スペック§7-1)

- `src/pages/MusumePage.tsx`
- `src/features/musume/` 配下: `api/musume.ts`・`api/schemas/musumeSchema.ts`・`queries.ts`・
  `components/`・`musume.css`
- CSSはモックのトークンを **`--msm-*` プレフィックスのローカルCSS変数**として `musume.css` に移植
  (画面固有カラーコードの散在禁止・既存 `--osh-*`(`src/features/oshigoto/oshigoto.css`)と同じ流儀)。
- ルーティング `/musume` を既存ルータに追加し、`src/components/layout/AppShell.tsx` のナビに
  「むすめ」を追加(アイコン: lucide-react の `Heart`)。
- 通信層は `src/features/koekake/queries.ts` の**mutation直列化+サーバ応答で確定**のパターンを踏襲
  (DR-010: 楽観更新せずサーバの返すplan全体で状態を上書き)。

### 2. D-01 ホーム(§7-2・モック準拠)

- レース縁ヘッダー+挨拶「おかえり、あきちゃん」+日付+モード切替チップ(🌻夏休み/🏫学校 → `PATCH mode`)。
- 見通し3カード: ❤️いまから何する? / 🎒明日何がいる? / 3枚目はモードで切替
  (夏=⏰明日何時に起きる? ⇄ 学校=🕒何時間目から登校?)。
- タップでボトムシート: チップ選択+「🎀ママと決める」「今は決めない」常設+「これにする!」。
  - いまから何する?(複数可): 夏=夏休みの宿題/自由研究/遊ぶ/休む/入浴/その他、
    学校=宿題/テスト勉強/学校の課題/遊ぶ/休む/入浴/その他。「その他」は1行自由入力。
  - 明日何がいる?(複数可): 夏=水筒/ぼうし/宿題/財布/ハンカチ/その他、
    学校=宿題/水筒/体操服/エプロン/提出プリント/財布/定期入れ/ハンカチ。
  - 起床時刻(夏・単一選択): 7:00/7:30/8:00/8:30/9:00よりあと → `PATCH wake_up_time`。
    登校時限(学校・単一選択): first_period〜(D-04の8択・モックのラベル文言が正)→ `PATCH school_start_period`。
  - チップ選択の保存は `PUT items`(カテゴリ置換・配列順)。「ママと決める」= `PATCH` で該当stateを `with_mama` に。
    「今は決めない」=保存せず閉じる(中立表示のまま)。
- 決定内容はカードのans行にローズ色で表示(モック準拠)。state表示はサーバ応答のplanが正。

### 3. D-05 振り返りシート(§7-3)

- チェック5行(夏=外出/学習/休憩/必要な物/起きる時刻、通常=できたこと/手伝ってもらったこと/困ったこと/
  明日に回すこと/明日の予定。文言はモックが正)。
- 「確認おわり!」→ `POST /api/musume/plan/{id}/reflection/complete` →
  「ママに『確認完了』が届いたよ 🎀」表示+カードに「できた🎀」バッジ(`review.completed_at` 非null判定)。

### 4. おしごと入口・メモ(§7-4)

- 夜グラデの入口カード(モック準拠)→ `/oshigoto` へ既存ルータの `Link`。**おしごと側コードは無変更**。
- メモカード: `category='memo'` の plan_items へ保存(`PUT items`)。

### 5. 母側 KoekakePage への追記2点のみ(§7-5)

1. 「むすめの見通し」カード: `GET /api/koekake/musume-summary?date=…` を表示
   (3項目タイトル+起床時刻or登校時限+振り返り完了バッジ。`summary:null` 時は「まだ決めてないよ」の中立表示)。
2. 「いつでも」タブ: `GET /api/koekake/tasks?phase=anytime` を並行取得し、**タスクが1件以上ある日のみ**
   4番目のタブとして表示(0件=非表示。現状シード無しのため非表示のままが正)。
- **この2点以外、KoekakePage・koekake featureの既存ロジックに触らない**(既存タブ・カード・mutation直列化は無変更)。

### 6. 表示原則(§7-6・レビューで必ず見られる)

- **声かけ回数を娘画面に出さない**・赤字/失敗色なし・「今は決めない」でも中立表示。
- 文言は漢字混じり(全ひらがな禁止)・モックの文言が正。
- せめない表現(FR-M10禁止表現)ゼロ。

### 7. vitestテスト(§8・既存慣習: `vi.fn` fetchモック。**MSW導入禁止**)

`src/features/koekake/KoekakePage.test.tsx` の流儀を踏襲し、`src/features/musume/` にテストを置く:

- plan取得と3カード表示
- チップ保存(PUT items → **サーバ応答で確定**を検証)
- ママと決める(PATCH state=with_mama)
- モード切替で3枚目カード・チップ・振り返り項目が切替
- 振り返りcomplete → バッジ表示
- 母側: musume-summary表示 / `summary:null` 時の中立表示 / anytimeタブの出し分け(0件=非表示・1件以上=表示)

## 絶対に守ること

- 既存ファイルの変更は **ルータ/AppShell(ナビ追加)** と **KoekakePage系(§7-5の2点)** のみ。
  **oshigoto / child-plan / taskRecords / mamakaji には一切触らない**。
- 名前「あきちゃん」は固定文字列でよい。
- コミット・pushはしない(レビュー後にオーケストレーター側で行う)。

## 完了条件(すべて自分で実行して結果を報告に貼る)

```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

- lint / typecheck / test は**必ず緑**にする(テスト件数・pass数を貼る)。
- `npm run build` が Windows ネイティブクラッシュ(exit code -1073740791)した場合のみ、
  既知の環境要因として**クラッシュした事実を報告に明記**すればよい(それ以外のbuildエラーは直すこと)。
- 実装ファイル一覧・スペック/モックから逸脱した点(あれば)を報告する。
