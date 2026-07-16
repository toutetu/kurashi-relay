# ママの家事手帖 フロントエンド実装スペック（第3段階）

対象: ママ（母）用の家事記録「ママの家事手帖」= 2画面（きろく／おやつ図鑑）。
モック: `docs/mockups/mama-kaji-sweets.html`（見た目・文言の正）。
第1・2段階（`docs/oshigoto-frontend-spec.md` / `-2.md`・実装済み）の厳守事項をすべて引き継ぐ:
**frontend/ のみ・API/永続化/認証なし・新規ライブラリなし・モック定数＋useStateのみ・自分を責めない設計（赤バツなし・取消可・減点なし）・`npm run typecheck`/`build` 通過・既存テストを壊さない・git commit しない。**

## 独立性
- 新フィーチャーとして `src/features/mamakaji/` を作る。**oshigoto のコードは import しない**（作法・構造の参考にはしてよい。Modal等は自前コピーで持つ）。
- 専用CSS `src/features/mamakaji/mamakaji.css` に**パティスリー配色のローカル変数 `--mkj-*`** を定義（oshigoto.css の `--osh-*` と同じ流儀で light / `.dark` 両対応）:
  - light: page1 #F6EEE4 / page2 #FFFBF6 / ink #4A3E36 / ink-soft #8E7E72 / ink-faint #BBAA9C / card #FFFFFF / card2 #FBF4EC / line #EFE4D6 / line2 #E5D4C1 / rasp #C15A72 / rasp-deep #963F55 / rasp-soft #F8E4E9 / caramel #C0873C / caramel-soft #F5E7CF / caramel-ink #8A5E22 / sage #88A87C / sage-soft #E8EFE1 / plum #9C6B8E / plum-soft #F0E4EE
  - dark: page1 #211A17 / page2 #2A211C / ink #F3EAE1 / ink-soft #C4B4A6 / ink-faint #8B796C / card #2E2420 / card2 #372A24 / line #43342C / line2 #55423A / rasp #DE8397 / rasp-deep #F1BEC9 / rasp-soft #3E2831 / caramel #D9A45E / caramel-soft #3A2C1A / caramel-ink #D9A45E / sage #A7C49B / sage-soft #26331F / plum #C295B4 / plum-soft #3A2E37

## ルーティング
- `/mama-kaji`（きろく）と `/mama-kaji/zukan`（おやつ図鑑）を `App.tsx` に追加。
- AppShell ナビに「家事手帖」を追加（lucide `Cookie` アイコン、「記録」の下あたり）。`pageTitles` に `/mama-kaji`: "ママの家事手帖"、`/mama-kaji/zukan`: "世界のおやつ図鑑"。
- 2画面の切替: `MamaKajiTabs.tsx`（丸ピルNavLink×2「きろく」「おやつ図鑑」、activeは `--mkj-rasp` 塗り）。

## データ（`src/features/mamakaji/data.ts`）
```ts
export type KajiTask = { id: string; emoji: string; label: string; done: boolean; tone: "rasp"|"cara"|"sage"|"plum" };
export const INITIAL_KAJI: KajiTask[] = [
  { id:"shokki", emoji:"🍽️", label:"食器を洗った", done:true, tone:"rasp" },
  { id:"sentaku", emoji:"🧺", label:"洗濯を回して干した", done:false, tone:"sage" },
  { id:"nanashi", emoji:"✨", label:"名もなき家事をやった", done:false, tone:"plum" },
  { id:"soji", emoji:"🧹", label:"床に掃除機をかけた", done:false, tone:"cara" },
  { id:"yuhan", emoji:"🍳", label:"夕飯を作った", done:false, tone:"rasp" },
];
export const KAJI_CHALLENGE = { emoji:"🫧", label:"換気扇をさっと拭く" };
export const STAMP_SIZE = 10;
export const INITIAL_JAR = 6;         // これまでの貯まり（積み上げ式）→ 初期 6+1=7/10「あと3個」
export const STREAK_DAYS = 4;
export const POINT_PER_STAMP = 100;   // 10個で100ポイント
export const TICKET_COST = 250;       // 「おやつを作る券」
export const INITIAL_POINTS = 190;    // → あと60pt = 家事6個ぶん

export type Sweet = {
  id: string; emoji: string; name: string; country: string; flag: string; rare?: boolean;
  recipe: [string, string, string]; mapNote: string; culture: string;
};
export const SWEETS: Sweet[] = [
  { id:"lamington", emoji:"🟫", name:"ラミントン", country:"オーストラリア", flag:"🇦🇺",
    recipe:["スポンジを四角に切る","チョコにくぐらせる","ココナッツをまぶす"],
    mapNote:"南半球の広い国、オーストラリア。", culture:"オーストラリアの定番おやつ。記念日にもよく食べる、一口サイズの人気者。" },
  { id:"macaron", emoji:"🌈", name:"マカロン", country:"フランス", flag:"🇫🇷", rare:true,
    recipe:["卵白と砂糖を泡立てる","アーモンド粉と合わせて絞る","クリームをはさむ"],
    mapNote:"ヨーロッパの国、フランス。", culture:"パリの菓子店の看板スイーツ。色ごとに味がちがう、小さな宝石。" },
  { id:"pannacotta", emoji:"🍮", name:"パンナコッタ", country:"イタリア", flag:"🇮🇹",
    recipe:["生クリームと牛乳を温める","ゼラチンを溶かす","冷やし固める"],
    mapNote:"長ぐつの形の国、イタリア。", culture:"「煮たクリーム」という意味。北イタリア生まれのつるんとしたデザート。" },
  { id:"mooncake", emoji:"🥮", name:"月餅", country:"中国", flag:"🇨🇳",
    recipe:["あんを丸める","皮で包んで型に入れる","こんがり焼く"],
    mapNote:"日本のとなり、中国。", culture:"中秋節に家族で月を見ながら分け合う、まんまるのお菓子。" },
];
export function pickRandomSweet(): Sweet { /* SWEETS からランダム */ }
```

## 画面1: きろく（`src/pages/MamaKajiPage.tsx`）
モックの Scene1〜3 に沿う。構成は oshigoto ホームと同型（自前実装）。
- 挨拶: しずく2滴SVG（rasp＋caramel配色）＋「おつかれさま、ともこさん / 今日も よくやってる」＋チップ「🍵 ひと息」。
- 進捗ヒーロー: 左に**おかしびんSVG（JarGauge.tsx）**、右に「世界のおやつまで **あと N個** / びんの中身 count / 10個 / 🍰 あとN個で おやつスタンプ！」。
  - JarGauge: モックのびんSVG（viewBox 130x150、丸角ボディ＋紫→rasp蓋＋リボン、ハイライト線）を再現。**中身はキャンディ玉（円）を count 個まで表示**（位置は固定配列10個ぶん、色は rasp/caramel/sage/plum のループ）。clipPathでボディ内に収める。
- 「今日の 家事」リスト: `INITIAL_KAJI` 5件、行タップでトグル（+1ふわっと演出、取消可）。
- +1チャレンジ（点線枠・🫧換気扇）＋「🎫 4日 続いてる」チップ。
- **10個で `SweetRevealModal`**: 「家事 10個、おつかれさま！」＋お菓子絵文字メダル＋「◯◯ ゲット！🇮🇹」＋「🎫 100ポイント たまった」＋「『作る券』まで あと◯個（M個は 繰り越し）」。閉じると繰り越しリセット・獲得スイーツを図鑑stateへ（ページ内stateでよい）・ポイント+100。
- ポイント残高チップをヒーロー下か図鑑タブ側に小さく表示: 「🎫 190pt ／ 作る券まで あと60pt」。

## 画面2: おやつ図鑑（`src/pages/MamaKajiZukanPage.tsx`）
モックの「🍰 あつめる」＋詳細に沿う。
- ヘッダ「わたしの 世界のおやつ図鑑」＋説明「🌍 集めるほど、行ってみたい国・作ってみたいおやつが増える」。
- グリッド4列: `SWEETS` 4種（丸タイル・国旗バッジ右下・マカロンはrare枠）＋「?」空セル4つ（点線）。
- フッター: 「集めたおやつ **4個**」「🎫 作る券まで あと**6個**」。
- **タップで詳細パネル**（同ページ内の展開 or モーダル、実装しやすい方）: 大きい絵文字＋名前＋「国旗 国名」、3行カード = 📍どこの国？（mapNote）／📖つくりかた（recipe 3ステップ）／🌏豆知識（culture）。最下部に rasp 塗りCTA風バナー「🎫 250ポイントで『おやつを作る券』と交換 — 週末、娘と一緒に作る／自分へのごほうびに」（押しても何も起きない飾りでよい。`aria-disabled`）。
- 「← 図鑑にもどる」で一覧へ。

## 受け入れ条件
- `/mama-kaji` と `/mama-kaji/zukan` が表示され、タブで行き来できる。AppShellナビに「家事手帖」。
- 家事タスクのトグルでびんのキャンディが増減し「あと◯個」更新。10個で SweetRevealModal → 閉じると繰り越し＋ポイント+100。
- 図鑑: 4種＋空4セル、タップで詳細（地図メモ・レシピ3手順・文化・作る券バナー）。
- 配色はパティスリー（--mkj-*）で oshigoto と混ざらない。赤バツ・減点なし。
- API通信・backend変更なし。`npm run typecheck`・`npm run build` 通過、既存テスト緑。
