# くらしのおしごと フロントエンド実装スペック（第2段階）

対象: 娘バージョンの残り3画面 = **ゾンビ図鑑／USJ達成チェック＋おこづかいグッズ**。
モック: `docs/mockups/child-oshigoto-halloween.html` の「🧟 あつめる」「🎢 いく」「🎃 かう」セクション（見た目・文言の正）。
第1段階（`docs/oshigoto-frontend-spec.md`・実装済み）の厳守事項をすべて引き継ぐ:
**frontend/ のみ・API/永続化/認証なし・新規ライブラリなし・モック定数＋useStateのみ・漢字は大人と同じで表現は小学生向け・せめない設計（赤バツなし・取消可）・`npm run typecheck`/`build` 通過・既存テストを壊さない・git commit しない。**

## ルーティングとタブ
- 追加ルート: `/oshigoto/zukan`（図鑑）と `/oshigoto/usj`（USJ達成＋グッズ）。`src/App.tsx` に第1段階と同様に追加。
- 3画面の行き来: 共有コンポーネント `src/features/oshigoto/components/OshigotoTabs.tsx` を新規作成し、`/oshigoto`（きろく）・`/oshigoto/zukan`（ずかん）・`/oshigoto/usj`（USJ）を `react-router-dom` の `NavLink` で切替。既存 `SegmentedTabs` の見た目に寄せた丸ピル型でよい（紫トーン、activeは `--osh-violet` 塗り）。3ページすべての上部（挨拶ヘッダーの下）に置く。既存 `OshigotoPage` にも追加する。
- AppShell のナビは第1段階の「おしごと」1項目のまま（増やさない）。`pageTitles` に `/oshigoto/zukan`: "ゾンビ図鑑"、`/oshigoto/usj`: "USJ 達成チェック" を追加。

## データ追加（`src/features/oshigoto/data.ts` に追記）
```ts
export type ZukanEntry = { zombie: Zombie; collected: boolean; photoUrl?: string };
// 図鑑の初期状態: モックどおり7種すべて収集済み（吸血鬼はrare表示）
export const INITIAL_ZUKAN: ZukanEntry[] = ZOMBIES.map(z => ({ zombie: z, collected: true }));

export type Ride = { id: string; name: string; place: string; placeEmoji: string; done: boolean };
export const RIDES_2025: Ride[] = [
  { id:"r1", name:"ホラー・ナイト・アカデミー ～絶叫の15年～", place:"グラマシーパーク", placeEmoji:"🎭", done:true },
  { id:"r2", name:"ファクトリー・オブ・フィアー ～ゾンビ・ツアー～", place:"ステージ 22", placeEmoji:"👣", done:true },
  { id:"r3", name:"18番地の魔女 ～感情と戯れる魔女の館～", place:"ステージ 18", placeEmoji:"🚪", done:true },
  { id:"r4", name:"バイオハザード レクイエム ザ・ダイブ", place:"ステージ 18", placeEmoji:"🧪", done:false },
  { id:"r5", name:"チェンソーマン・ザ・カオス 4-D", place:"シネマ 4-D シアター", placeEmoji:"🎬", done:true },
  { id:"r6", name:"貞子の呪い ～ダーク・ホラー・ライド～", place:"スペース・ファンタジー", placeEmoji:"🎢", done:true },
  { id:"r7", name:"King Gnu「SO BAD」×ハリウッド・ドリーム", place:"ハリウッド・ドリーム", placeEmoji:"🎢", done:true },
  { id:"r8", name:"チェンソーマン×ハリドリ ～IRIS OUT～", place:"バックドロップ", placeEmoji:"🎢", done:false },
  { id:"r9", name:"Ado「唱」×ハリウッド・ドリーム", place:"バックドロップ", placeEmoji:"🎢", done:true },
  { id:"r10", name:"三代目 J SOUL BROTHERS「Rat-tat-tat」", place:"バックドロップ", placeEmoji:"🎢", done:false },
  { id:"r11", name:"更衣室", place:"ステージ 18", placeEmoji:"🚪", done:true },
];
export const LIMITED_ZOMBIE: Zombie = { id:"limited2025", emoji:"🎃", name:"2025年の限定ゾンビ", rare:true };

export type Goods = { id: string; emoji: string; name: string; price: number };
export const GOODS: Goods[] = [
  { id:"badge", emoji:"🧷", name:"ハミクマ 缶バッジ", price:1000 },
  { id:"pouch", emoji:"👜", name:"ハミクマ ポーチ", price:2600 },
  { id:"keychain", emoji:"🔑", name:"ハミクマ キーチェーン", price:3100 },
  { id:"plush", emoji:"🧸", name:"ハミクマ ぬいぐるみ", price:6000 },
];
export const INITIAL_COINS = 400; // 円。10個で+100円（第1段階のCOIN_PER_FULL_MOON）
```

## 画面1: ゾンビ図鑑（`src/pages/OshigotoZukanPage.tsx`）
モックの「わたしの ゾンビ図鑑」に沿う。背景・配色は第1段階の `oshigoto.css` を再利用。
- ヘッダ: 🎀リボン＋「ゾンビ図鑑」＋チップ「2025年 USJ」。説明行「🌙 満月のたび1体。USJの7エリアのゾンビたち」。
- グリッド4列: `INITIAL_ZUKAN` の7セル＋最後に**📷写真登録セル**。各セルは丸角タイル＋下にキャプション（例「サーカスの ピエロ」「処刑人」…）。rare は枠をローズ＋右上に「レア」バッジ。
- **写真登録（フロントのみ）**: 📷セルをタップ → `<input type="file" accept="image/*">`（非表示inputをクリック）→ 選択されたら `URL.createObjectURL` で新しいセルとして末尾に追加（`ZukanEntry` に photoUrl、名前は「わたしの写真」固定でよい）。削除は不要。永続化しない（リロードで消えてよい）。
- フッター行: 「集めたゾンビ **N体**」「USJ図鑑 7 / 7エリア」。
- その下に予告カード（点線枠）: 「🏮 世界のお化け・妖怪ずかん（もうすぐ）／キョンシー🇨🇳・河童・天狗・ろくろ首🇯🇵…」— 押せない飾り。

## 画面2: USJ達成チェック＋グッズ（`src/pages/OshigotoUsjPage.tsx`）
モックの「🎢 いく」＋「🎃 かう」を1ページに縦積み。
### 達成チェック
- ヘッダ: ✓丸アイコン＋「行った？チェック」＋チップ「2025」。
- 進捗カード: 「N / 11」大きく、右に「🎃 制覇で 限定ゾンビ」。
- リスト: `RIDES_2025` を `useState` で持ち、行タップで done トグル（第1段階の TaskRow と同じ作法・チェックは四角）。名前は1行省略（truncate）、下に「絵文字＋場所」。
- **11/11 になった瞬間**: 第1段階の `ZombieRevealModal` を流用して `LIMITED_ZOMBIE` を表示（見出しは「全部 制覇！」に差し替えられる propを足してよい。コイン表示は出さない）。閉じてもリストはそのまま（リセットしない）。
- チェックを外して11未満に戻っても何も起きない（減点なし）。
### おこづかいグッズ
- ヘッダ: 「おこづかい ちょきん」。
- 目標カード: 選択中グッズ（絵文字・名前・「目標 ¥N,NNN」）＋進捗バー（`INITIAL_COINS / price`、上限100%）＋「いま **¥400** ／ ¥N,NNN ・ あと **M個** できたら 買える！」（M = ceil((price - coins) / 100)、負なら「もう 買える！🎉」）。
- 「🎯 目標を えらぶ」: `GOODS` 4つのミニカード（絵文字・名前・価格）。タップで選択切替（selected は枠かぼちゃ色 `--osh-pump` 系。oshigoto.css にローカル変数 `--osh-pump`/`--osh-pump-soft`/`--osh-pump-ink` を追加: light `#E39A3C`/`#F7E7CF`/`#8A5E22`, dark `#E8AE5A`/`#3A2E1C`/`#E8AE5A`）。
- 価格注記（小さく）: 「価格は2025年の参考＋今年の値上がり見込み」。

## 受け入れ条件
- `/oshigoto/zukan`・`/oshigoto/usj` が表示され、3画面がタブで行き来できる。
- 図鑑: 7種＋📷セル。写真を選ぶとセルが増える。rareバッジ表示。
- USJ: 行タップでトグル→ N/11 更新。11/11 で限定ゾンビモーダル。戻しても減点なし。
- グッズ: 目標切替でバーと「あとM個」が再計算される。
- 赤・バツ・減点表示なし。API通信・backend変更なし。`npm run typecheck`・`npm run build` 通過、既存テスト緑。
