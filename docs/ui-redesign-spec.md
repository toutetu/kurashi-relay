# UIリニューアル実装仕様 — B案v3「きぶんカラーで、かわいく」

対象: `frontend/` のみ。backend には触らない。
参考モック: `docs/mockups/home-b3.html`(ブラウザで開いて見た目・挙動を確認すること。これが正解の見た目)。
完了条件: `frontend` で `npm run build` と `npm test -- --run` が全部通ること。

## 0. デザイン原則

- カードは白、枠線はヘアライン1px、色はアイコンチップ・バッジ等の小部品だけ
- 太字は数字と見出しだけ。説明文は通常ウェイト
- 押せるものは「下2pxの縁」で立体に。ホバーでふわっと浮き、クリックでピコッとはずむ
- `prefers-reduced-motion: reduce` では transform/animation を無効化
- 既存のアクセシビリティ(aria-label / aria-pressed / focus-visible リング / フォーカストラップ)は**絶対に壊さない**

## 1. `src/styles/tokens.css` — 全面書き換え

### きぶんカラー(5テーマ、`html[data-mood="…"]` で切替)

デフォルト(`:root`)= さくら。各テーマは `--primary / --primary-deep / --primary-soft / --ground / --line / --line-soft / --ink / --muted / --faint` を上書きする。

| mood | primary | primary-deep | primary-soft | ground | line | line-soft | ink | muted | faint |
|---|---|---|---|---|---|---|---|---|---|
| sakura | #c9647e | #a94e66 | #fae9ee | #fdf6f7 | #f2dfe4 | #f7eaee | #443340 | #8a7580 | #b3a0aa |
| ai | #33608c | #28517a | #eef3f8 | #f8f6f1 | #e7e2d8 | #efebe2 | #2c3446 | #6c7280 | #9aa0ad |
| sora | #3f7cb8 | #326396 | #e7f0f9 | #f4f8fb | #dde8f1 | #eaf2f8 | #2c3a4a | #6e8092 | #9cadbd |
| mori | #45855a | #366b48 | #e6f2e9 | #f4f9f5 | #dceae0 | #e9f3ec | #2e4033 | #6d8474 | #9cb2a2 |
| yoru | #6c5cb8 | #584a99 | #ece8f8 | #f4f2fa | #e2ddf0 | #edeaf7 | #362f4d | #776f92 | #a49dbb |

### カテゴリ色(moodに依存しない固定色)

```
--coral: #cf6a5f;  --coral-deep: #a94a41;  --coral-soft: #faefec;
--amber: #b07c1f;  --amber-deep: #8a6215;  --amber-soft: #f9f1de;
--cat-blue: #4a7fb5; --cat-blue-deep: #38618c; --cat-blue-soft: #e9f1f8;
--fuji: #7a69ae;   --fuji-deep: #60528c;   --fuji-soft: #f2eff9;
--green: #3f7d54;  --green-deep: #326543;  --green-soft: #eaf3ec;
--balance-sleep: #a8b8d8; --balance-waiting: #e2d4ae;
--balance-activity: #e8a29a; --balance-recovery: #a8c9ab;
--surface: #ffffff;
```

### 旧変数のマッピング(他コンポーネントを壊さないため必ず定義)

```
--page-background: var(--ground);   --text: var(--ink);
--muted-text: var(--muted);         --border: var(--line);
--neutral-soft: var(--line-soft);   --focus: var(--primary);
--mother-red: var(--coral); --mother-red-strong: var(--coral-deep); --mother-red-soft: var(--coral-soft);
--mother-yellow: #d9a53e; --mother-yellow-strong: var(--amber-deep); --mother-yellow-soft: var(--amber-soft);
--mother-blue: var(--cat-blue);
--mother-blue-strong: var(--primary-deep);   /* リンク・選択状態はきぶん色に追従 */
--mother-blue-soft: var(--primary-soft);
--daughter-purple: var(--fuji); --daughter-purple-soft: var(--fuji-soft);
--daughter-blue: var(--fuji-soft); --daughter-blue-strong: var(--fuji);
--daughter-pink: #f0b6d2; --daughter-text: var(--ink); --daughter-surface: var(--surface);
--card-radius: 1.25rem;
--card-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 3%, transparent),
               0 10px 28px -14px color-mix(in srgb, var(--ink) 10%, transparent);
```

### カードトークン(全トーン白背景+ヘアライン)

全 `--card-*-background` → `var(--surface)`、全 `--card-*-border` → `var(--line)`、全 `--card-*-text` → `var(--ink)`。
アイコンチップだけ色付き: red→coral-soft/coral、yellow→amber-soft/amber、blue→primary-soft/primary、neutral→line-soft/ink、daughter→fuji-soft/fuji。

### ボタントークン

blue トーンを「きぶん色」に: background `var(--primary)`、hover `color-mix(in srgb, var(--primary) 88%, white)`、active/border-deep `var(--primary-deep)`、disabled `var(--primary-soft)`。solid の前景は常に白(hover でも白)。soft/outline/ghost の前景は `var(--primary-deep)`。
red→coral 系、yellow→amber 系(solid 前景は白)、neutral→ink 系、daughter→fuji 系で同様に。

## 2. `src/index.css`

- body 背景: 水玉 `radial-gradient(circle, color-mix(in srgb, var(--primary) 4%, transparent) 1px, transparent 1.5px) 0 0 / 22px 22px, var(--page-background);`(既存のradial blobは削除)
- `.button` に押し心地を追加:
  - 基本: `box-shadow: 0 2px 0 var(--button-edge)`。variant別: solid→`--button-edge: var(--button-tone-active-background)`、soft/outline→`color-mix(in srgb, var(--button-tone-border) 35%, var(--line))`、ghost→transparent
  - hover: `translateY(-1px)` + `0 3.5px 0 var(--button-edge), 0 8px 16px -8px color-mix(in srgb, var(--ink) 25%, transparent)`
  - active: `translateY(1.5px)`、box-shadow none。disabled: shadow none
  - `.pressable` の shadow/hover 規則は `.pressable:not(.button)` に変更(競合防止)
- キーフレーム追加:
  - `kr-pop`: 0%→scale(1)、40%→scale(.93)、75%→scale(1.05)、100%→scale(1)。`.popping { animation: kr-pop .3s cubic-bezier(.34,1.56,.64,1); }`
  - `kr-bump`: 40%で scale(1.25)。`.count-bump { animation: kr-bump .3s ease; }`
  - `kr-flyup`: 0% opacity 0 translateY(10px) / 25% opacity 1 / 100% opacity 0 translateY(-14px)。`.fly { position:absolute; right:2.75rem; top:-0.25rem; font-size:12.5px; font-weight:800; color:var(--primary); pointer-events:none; animation: kr-flyup .55s ease forwards; }`
  - reduced-motion で `.popping`/`.count-bump` は animation none、`.fly` は display none
- `.home-grid`(モバイル1列 / `@media (min-width:75rem)` で3列):
  ```
  grid-template-columns: minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr);
  grid-template-areas: "z2 z1 z1" "pl qs ql" "pl qs ql";
  ```
  `.area-z1/z2/qs/ql/pl` で grid-area 指定。gap 0.625rem(PCは10px)
- `.zone-label`: 13px/800/`var(--primary-deep)`、右側に `flex:1; height:1.5px; background: color-mix(in srgb, var(--primary) 16%, transparent)` の線(`::after`)

## 3. 新規 `src/features/mood/mood.tsx`

- `moods = [sakura🌸さくら, ai💙あい, sora💧そら, mori🌿もり, yoru🌙よる]`
- `MoodProvider`: `useState`(初期値は localStorage `kurashi-relay:mood`、不正値は sakura)。effect で `document.documentElement.dataset.mood = mood` + localStorage 保存(try/catch)
- `useMood()` フック
- `MoodPicker`: `role="group" aria-label="きょうのきぶんカラー"`。チップは `<button aria-pressed>`、絵文字+ラベル、選択中は `bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary-deep)]`、非選択は白+ヘアライン。下2px縁+hover浮き+pop(共通クラス使用)
- `src/main.tsx` で `<MoodProvider>` を `<App/>` の外側に追加

## 4. `src/components/layout/AppShell.tsx`

- ロゴ: 虹グラデ廃止 → `rounded-full bg-[var(--primary)] text-white` の円 + Sparkles
- PCサイドバー: 折りたたみ式アイコンレール
  - `useState` + localStorage `kurashi-relay:sidebar-open`(デフォルト**閉=レール**)
  - 閉: `w-20`、アイコンのみ中央寄せ、ラベルは `sr-only`(`title` 属性でツールチップ)、引用カード非表示
  - 開: 現状どおり `w-64` + ラベル + 引用カード
  - ヘッダーに切替ボタン(`hidden xl:grid`、aria-label「サイドバーをたたむ/ひろげる」、PanelLeftClose/PanelLeftOpen アイコン)
  - width は `transition-[width]`
- 引用カード: グラデ廃止 → `rounded-2xl border border-dashed border-[var(--line)] bg-[var(--primary-soft)] text-[var(--primary-deep)]`
- モバイル下部ナビ: **5項目 + 中央FAB**
  - `[ホーム, 今日の予定, 記録(中央FAB), 娘の状態, 今日のまとめ]`、grid-cols-5
  - 中央の「記録」リンクを浮き上がる円形FABに: `-mt-6 size-14 rounded-full bg-[var(--primary)] text-white shadow-lg border-4 border-[var(--page-background)]`、アイコン ClipboardPenLine + 極小ラベル「きろく」
- ピコッ委譲: `useEffect` で document click リスナー。`closest(".pressable, .button")` に `.popping` を付け直す(`classList.remove` → `void offsetWidth` → `add`)
- モバイルドロワー(フォーカストラップ含む)は**変更しない**

## 5. `src/pages/HomePage.tsx`

- ヘッダー: 日付(小・カレンダーアイコン付き)→ H1「今日のくらしを、見えるかたちに」(20px/800)。右側に `MoodPicker` と更新ボタン(ghost・小)を縦積み(モバイルは折り返し)
- `CurrentActivityCard`(NowBar化、§6)を**タブの外・常時表示**で最初に配置
- `SegmentedTabs`(今日/記録)は現状のURL同期ロジックのまま(モバイルのみ表示)。既定タブは今日
  - 今日タブ: 今日の予定(1日分すべて)
  - 記録タブ: クイック活動記録・クイック記録
- グリッド: `home-grid` + `area-*` クラス。ゾーンラベルは左 `👀 きょうのようす` / 右 `✏️ きろくする` を `<p class="zone-label hidden xl:flex">`(見出しタグにしない)
- `data-testid="home-dashboard-grid"` は grid の div に残す
- QuickStartCard に `runningOptionId` を渡す

## 6. `src/features/dashboard/components/CurrentActivityCard.tsx` — NowBar化

- エクスポート名・props(`activity`, `onChange`)・経過時間ロジック(useElapsedMinutes)は**そのまま**
- 見た目: DashboardCard をやめ、`<section aria-labelledby>` + `sr-only` の `<h2>現在の活動</h2>`。白背景・`border: 1.5px solid color-mix(in srgb, var(--primary) 28%, var(--line))`・rounded-full(モバイルはrounded-3xl+折返し)・カードshadow
- 内容: 緑パルスドット(進行中のみ animate-pulse)+ 活動名(15px/800)+ StatusChip + 「開始 HH:MM ・ 関連予定 X」 + スペーサー + 「経過 **{formatMinutes(elapsedMinutes)}**」(強調・tabular)+ ボタン群
- ボタン: 一時停止(soft)/再開(soft)/終了(solid, tone blue=きぶん色)/切り替える(ghost)。ラベル文字列・`#quick-start` スクロールは現状のまま
- activity なし: 同じバーで「現在、進行中の活動はありません。」+「活動を始める」(solid)
- テスト `DashboardCards.test.tsx` が通ること(formatMinutes のテキストノード、一時停止/再開ボタン名)

## 7. `src/features/dashboard/components/QuickCards.tsx`

### QuickStartCard
- タイル型ボタン(縦積み: 色付き丸チップ+ラベル11px/700)、`grid-cols-3` gap-2
- カテゴリ色/アイコン: 就労準備=cat-blue/BriefcaseBusiness、家事=amber/House、登校支援=green/Backpack、待機=cat-blue/Clock3、回復・休息=fuji/Moon、ラストウォー=coral/Gamepad2
- タイル: 白背景・1.5pxヘアライン・rounded-2xl・下2px縁・hover浮き・active沈み(共通の押し心地)
- `runningCategory` prop 追加: 該当タイルに緑の枠+右上に緑ドット(進行中の目印)
- 注記文はそのまま

### QuickLogsCard
- **行全体ボタン**の縦リスト: `<li>` 区切り線(line-soft)+ `<button>`(w-full, min-h-11, rounded-xl, 左ラベル/右に件数バッジ+丸い＋アイコン)
- aria-label は現状の `「{label}を記録。現在{count}件」` を**厳守**。Undoトースト(5秒失効)もロジックごと維持
- 件数バッジ: `rounded-full bg-[var(--primary-soft)] text-[var(--primary-deep)] text-xs font-black px-2.5`。0件は `bg-[var(--neutral-soft)] text-[var(--faint)]`。`key={count}` で再マウントして `.count-bump` を再生
- ＋アイコン円: 32px、primary-soft地+primary-deep、行hoverで primary地+白(目印。ボタンは行全体)
- 「+1」フライ演出: クリックでインクリメントする state key を行ごとに持ち、`<span key={n} class="fly" aria-hidden="true">+1</span>` を再マウント(タイマー不使用。CSS forwards で消える)

## 8. `src/components/ui/ScoreControl.tsx`

- props に `appearance?: "numbers" | "hearts" | "faces"`(default numbers)と `tone?: "primary" | "daughter"` を追加(旧 "red"/"blue" は "primary" 扱いに置換。呼び出し側も更新)
- **aria-label `「{personLabel}の{label}を{score}にする」` と aria-pressed(選択値のみ true)は厳守**(App.test が依存)
- hearts: 5ボタン、`score <= value` のハートを塗り(lucide Heart, fill currentColor)、超過は輪郭のみ。色は tone に応じ primary/fuji
- faces: 絵文字 `😖😕🙂😊😆`。非選択は `grayscale + opacity .75`、選択は primary-soft地+primary枠
- ボタン: h-10前後・rounded-xl・ヘアライン・下2px縁・hover浮き
- `TodayCards.tsx`: 母の体調→hearts、母の気分→faces(tone primary)。娘も同様(tone daughter)。注記「1(低め)〜5(良い)。…」は残す

## 9. その他カード

- `TodayCards.tsx` NextPlansCard: タイムレール式に変更 — 各行「時刻(13.5px/800/primary-deep/tabular) + レール(10px丸ドット primary枠+下へ2px線 line色, 最終行は線なし) + タイトル(13.5px/700)+期間(11.5px/muted)」。SectionLink はそのまま
- `SummaryCards.tsx` TimeBalanceCard: 4タイル廃止 → **積み上げ横バー1本**(h-4, rounded-full, セグメント間2px, 各セグメント最小6%、色は --balance-*)+ 凡例2列グリッド(丸ドット+ラベル+`formatMinutes`値/800/tabular)。バーに `role="img"` と日本語 aria-label(内訳を読み上げ)
- `DashboardPrimitives.tsx` MetricTile: `bg-white/80` → `bg-[var(--neutral-soft)]`
- `DashboardCard.tsx`: `border-t-4` を削除(`border` のみに)。アイコンチップ `rounded-xl/2xl` → `rounded-full`。それ以外のクラス(テストが見る `dashboard-card` 等)は維持

## 10. テスト更新(`src/App.test.tsx` のみ)

1. 「ホームには表示順どおり4項目…」: main h2 の期待順を `["現在の活動","今日の予定","クイック活動記録","クイック記録"]` に変更。grid のクラス assert は `toHaveClass("home-grid")` に変更
2. 「PCサイドバーには…モバイル下部には6項目」: 下部ナビの link 数を 5 に変更(テスト名も「5項目」に)
- 他のテストは**修正せず通す**(通らない場合は実装側を直す)

## 11. 検証

```
cd frontend
npm run build
npm test -- --run
```
両方グリーンになるまで修正。lint スクリプトがあればそれも。
