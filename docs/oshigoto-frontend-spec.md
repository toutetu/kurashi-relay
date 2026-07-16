# くらしのおしごと フロントエンド実装スペック（第1段階）

対象: 娘バージョン「よるのハロウィン・ラリー」の**ホーム（毎日の記録ループ）**。
モック: `docs/mockups/child-oshigoto-halloween.html`（この見た目・文言に合わせる）。

## 厳守事項
- **フロントエンドのみ。** `frontend/` 配下だけを変更する。`backend/` は触らない。
- **API・バックエンド・永続化・認証を追加しない。** データは**フロント内のモック定数＋React useState**のみ。ネットワーク通信なし。
- 既存の規約に合わせる（下記）。新規ライブラリの追加は不可（既存の react, react-router-dom, lucide-react, Tailwind v4 のみ）。
- 文言は**漢字は大人と同じ・表現は小学生向け**（モックのまま）。
- ビルド・型チェックが通ること（`npm run build` / tsc）。既存テストを壊さない。

## 既存規約（frontend/src）
- Vite + React + TypeScript。ルーティングは `src/App.tsx` の `<Routes>`（`AppShell` の子）。
- スタイルは Tailwind v4 のユーティリティ＋CSS変数（`src/styles/tokens.css`）。任意値記法で変数参照: 例 `text-[var(--daughter-purple)]` `bg-[var(--surface)]` `border-[var(--line)]`。
- きぶんカラー = `html[data-mood="sakura|ai|sora|mori|yoru"]`。**娘バージョンは紫 = `yoru` 相当**。既存トークン `--daughter-purple`(藤 #7a69ae) / `--daughter-purple-soft` / `--daughter-pink` を活用。ハロウィン差し色は本スペック内でローカルに定義してよい（コウモリ紫・かぼちゃ色は控えめに）。
- 既存UI: `src/components/ui/Button.tsx`（`color="daughter"` variantあり）、`SegmentedTabs`、`DashboardCard`。`src/components/layout/AppShell.tsx`。
- アイコンは `lucide-react`。**絵文字はモック同様そのまま使う**（🥛👚🎒🦇🧟🎀 等はテキストとして表示）。
- ページは `src/pages/*Page.tsx`、機能は `src/features/<name>/`、UIは `src/components/ui/`。

## 追加するもの
### ルート
`src/App.tsx` に追加: `<Route path="oshigoto" element={<OshigotoPage />} />`。
（AppShellのナビにも「おしごと」を足せるなら足す。難しければルートのみでよい。）

### ファイル構成（提案）
```
src/pages/OshigotoPage.tsx
src/features/oshigoto/data.ts                 // モックデータ・型
src/features/oshigoto/components/MoonGauge.tsx
src/features/oshigoto/components/ProgressHero.tsx
src/features/oshigoto/components/TaskRow.tsx
src/features/oshigoto/components/ChallengeCard.tsx
src/features/oshigoto/components/ZombieRevealModal.tsx
```

### 型・モックデータ（data.ts）
```ts
export type Task = { id: string; emoji: string; label: string; done: boolean; tone: "lav"|"peri"|"mint" };
export type Zombie = { id: string; emoji: string; name: string; rare?: boolean };

export const INITIAL_TASKS: Task[] = [
  { id:"kigae", emoji:"👚", label:"自分で着替えた", done:true, tone:"lav" },
  { id:"kaban", emoji:"🎒", label:"カバンを棚に置いた", done:true, tone:"peri" },
  { id:"shokki", emoji:"🥛", label:"夕ごはんの食器を運んだ", done:false, tone:"mint" },
];
export const CHALLENGE = { emoji:"🕯️", label:"明日の支度をする" };
export const STAMP_SIZE = 10;              // 10個で1スタンプ（満月）
export const CARRYOVER_START = 3;          // 例: 満月達成後は3個繰り越し
// 満月で登場するゾンビ（ランダムに1体）
export const ZOMBIES: Zombie[] = [
  { id:"pierrot", emoji:"🤡", name:"サーカスのピエロ" },
  { id:"exec", emoji:"🪓", name:"処刑人" },
  { id:"prisoner", emoji:"⛓️", name:"囚人" },
  { id:"testsub", emoji:"🧟", name:"実験体" },
  { id:"doll", emoji:"🎎", name:"日本人形" },
  { id:"vampire", emoji:"🧛", name:"吸血鬼", rare:true },
  { id:"demon", emoji:"👹", name:"悪魔・部族" },
];
```

### 状態と動作（OshigotoPage、ローカルstateのみ）
- `count`（現在の満月ゲージの個数, 0..10）と `tasks`（done配列）と `revealed`（登場したゾンビ or null）を useState。
- 初期 `count = 完了タスク数`（例では2）。表示上のデモは `count=3`（三日月）でもよいが、タスク完了と連動させるのが本筋。
- タスク行タップ → done をトグル。false→true で `count++`、true→false で `count--`（取り消し）。
- `count` が `STAMP_SIZE`(10) に達したら: `ZombieRevealModal` を表示（`ZOMBIES` からランダム1体）。閉じたら `count = 繰り越し(count - 10)`（例では3など、超過分）。獲得ゾンビは図鑑stateに push（図鑑画面は第2段階だが、state配列だけ用意しておく）。
- ヘッダーに「あと N 個」= `STAMP_SIZE - count`。「満月まで count / 10個」。
- 「せめない」: 未完了は淡いグレー表示、赤・バツは出さない。取り消しはいつでも可。

### 満月ゲージ（MoonGauge.tsx）— 重要・検証済みロジック
props: `{ count: number; size?: number }`。`f = count / 10`（0..1, 満ちる割合）。半径 R、中心 (cx,cy)。
- **月の満ち欠けを本物の月齢で描く。斜め下の三日月から満ちて満月へ。**
- 描画:
  1. うっすらグロー: 大きめの薄い円（`--moon-lit` opacity低め）。
  2. 影の円（暗い面）: 半径Rの円を `--moon-dark` で塗る。
  3. 明るい面（lit）を上に重ねる:
     - `f <= 0`: 描かない（新月）。
     - `f >= 1`: 半径Rの円を `--moon-lit` で塗る（満月）。
     - それ以外: 下記パスを `--moon-lit` で塗る。
       ```
       rx = R * Math.abs(Math.cos(Math.PI * f))
       sweep = f < 0.5 ? 0 : 1        // ← 三日月=0, 十三夜=1（検証済み）
       d = `M${cx},${cy-R} A${R},${R} 0 0 1 ${cx},${cy+R} A${rx},${R} 0 0 ${sweep} ${cx},${cy-R} Z`
       ```
     - lit（と craters を付けるなら）は `<g transform="rotate(35 ${cx} ${cy})">` で**35°傾ける**（斜め下に光らせる）。
  4. 輪郭: 半径Rの円を fill=none, stroke=`--line`（ヘアライン）。
- 色: `--moon-dark`(暗い面)= 例 `#B7A4DE`(light)/`#544784`(dark)、`--moon-lit`(明るい面)= `#F0E7FF`/`#DBCCFF`。これらは oshigoto 用にローカルCSS変数として定義してよい（tokens.css を汚さず、ページ/コンポーネント内 style か専用cssで）。
- 検証根拠: `sweep=0` で f<0.5 のとき右側の細い三日月、`sweep=1` で f>0.5 のとき左に細い影を残す十三夜になることを確認済み。

### 画面（OshigotoPage）モック対応
上から: 挨拶（しずくちゃんSVG or 絵文字＋「おかえり、あきちゃん / 今夜も 月が育つよ」＋「🦇 よる」チップ）→ ProgressHero（左に MoonGauge、右に「つぎのゾンビまで あと◯個 / 満月まで N/10個 / 🦇 満ちるほど ゾンビに近づく！」）→「今日の くらしのおしごと」見出し（細いリボン線）→ TaskRow×3 → ChallengeCard（点線枠・1日1チャレンジ）→ 連続チップ「🎀 3日 続いてる」。
- カードは白＋ヘアライン枠、角丸12〜16px、影は控えめ。押し心地: 行全体をボタン化、押下でわずかに縮む(active:scale)。
- レスポンシブ: スマホ幅(390px)基準。中央 max-width ~ 420px のモバイル的レイアウトでよい。

### 押し心地・演出（軽く）
- タップ時: チェックが付き、行が淡い紫に、`+1` が上にふわっと（CSSトランジション/キーフレーム、`prefers-reduced-motion` 尊重）。大きな音は無し。
- ZombieRevealModal: 中央に満月＋ゾンビ絵文字、「◯◯ゾンビ 登場！」「🪙 100円 たまったよ」「つぎの満月まで あと◯個」。`position:fixed` の全画面オーバーレイでよい（アプリ内なのでArtifact制約は無関係）。

## 受け入れ条件
- `/oshigoto` で表示され、モックの見た目（紫・満月ゲージ・タスク・チャレンジ・連続チップ）に沿う。
- タスクをタップで done トグル→ゲージの月が満ち欠けし「あと◯個」が更新。
- 10個で ZombieRevealModal が出て、閉じると繰り越し数にリセット、獲得ゾンビが図鑑stateに入る。
- 取り消し（再タップ）でゲージが戻る。赤・バツ・減点表示はない。
- API通信・backend変更なし。`npm run build` と型チェックが通る。既存テストが緑のまま。
- ライト/ダーク両方で文字が読める（できれば）。

## 第2段階（今回は対象外・後日）
ゾンビ図鑑ページ（USJ7エリア＋📷写真登録＋世界の妖怪拡張）／ USJライド達成チェック（`docs/mockups/child-oshigoto-halloween.html` のリスト）／ おこづかい→ハミクマグッズ目標（缶バッジ¥1,000〜ぬいぐるみ¥6,000, 2025+300円）／ ママ版（`mama-kaji-sweets.html`）。いずれもフロントのみ・モックデータで。
