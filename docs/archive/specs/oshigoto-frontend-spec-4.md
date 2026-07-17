# タップ時の全画面ごほうび演出 実装スペック（第4段階）

目的: タスク完了タップのたびに**画面いっぱいの「ごほうびの瞬間」**を見せ、報告するのが楽しくなる満足感を作る。
モックの正: `docs/mockups/mama-kaji-sweets.html` の Scene 2（びん大写し・「床、きれいになった！」・+1・おつかれさま！・8/10個・取り消し行）と、`docs/mockups/child-oshigoto-halloween.html` の Scene 2（月大写し・「食器を運べたね！」・できたね！）。
第1〜3段階の厳守事項をすべて引き継ぐ: **frontend/ のみ・API/永続化/認証なし・新規ライブラリなし・モック定数＋useStateのみ・赤バツなし・`npm run typecheck`/`build` 通過・既存テスト緑・git commit しない。features/mamakaji と features/oshigoto は相互 import しない**（同型コードは各featureに複製してよい）。

## 対象
1. **ママ版 `/mama-kaji`**（KajiCheerOverlay）
2. **娘版 `/oshigoto`**（CheerOverlay）
両方とも「タスク行タップで done になった瞬間」にオーバーレイ表示。取り消し（done→undone）では出さない。

## データ追加
### `features/mamakaji/data.ts` — KajiTask に `praise: string` を追加
```
shokki   → "食器、ぴかぴかになった！"
sentaku  → "洗濯物、おひさまの香り！"
nanashi  → "名もなき家事も、ちゃんと1個！"
soji     → "床、きれいになった！"
yuhan    → "今日のごはんも、ありがとう！"
```
### `features/oshigoto/data.ts` — Task に `praise: string` を追加
```
kigae  → "自分で着替えられたね！"
fuku   → "お洗濯の準備、ばっちり！"
shokki → "食器を運べたね！"
kaban  → "カバン、ちゃんと定位置！"
suito  → "水筒、出せたね！"
```

## オーバーレイ仕様（両版共通の振る舞い・見た目は各スキン）
- `position: fixed; inset: 0; z-index` は各 RevealModal より**下**。背景＝その feature のページグラデーション（page1→page2）を**ほぼ不透明（~0.97）**で敷く。中身は中央寄せ縦並び、`max-width: 420px`。
- 表示内容（上から）:
  1. **一言バブル**: `{task.emoji} {task.praise}`（丸ピル、mkj=rasp-soft／osh=violet-soft、モックのbubbleと同じ見た目）
  2. **大写しゲージ**: ママ=`<JarGauge count={count} dropTick={dropTick} size={150} />`（**ふた開閉＋キャンディ落下がここで再生される**）／娘=`<MoonGauge count={count} size={150} />`。周りに ✨⭐（娘は🦇も）の twinkle と、右上に「+1」float（既存keyframes再利用）
  3. **大見出し**: ママ=「おつかれさま！」／娘=「できたね！」（21px 800）
  4. サブ: ママ=「今日の家事」／娘=「くらしのおしごと」
  5. **カウント行**: 「{count} / 10個 ・ あと{remaining}個」（数字は rasp／violet の大きめ）。count===10 のときは「10 / 10個 ・ まんたん！」（ママ）／「10 / 10個 ・ 満月！」（娘）
  6. **取り消しボタン（小さく・目立たなく）**: 「↩ とりけす」だけの**小さなテキストボタン**（12px・ink-faint色・背景なし・枠なし。hover/focusで下線＋ink-soft程度）。カウント行の下に控えめに置く。ごほうびの主役（ゲージ・お祝い文言）より視覚的に弱いこと。クリックで**その task を undone に戻して**オーバーレイを閉じる（既存の toggle 経路＝ handleToggleTask(id) を呼ぶだけでよい）。タップ領域は最低44px高を確保（padding で稼ぐ、見た目は小さく）
  7. 下部に小さく「タップで とじる」（ink-faint。取り消しと混ざらないよう間隔を空ける）
- **閉じる**: どこをタップしても閉じる（取り消しボタンは stopPropagation）。**約2秒（2000ms）で自動クローズ**。Escapeキーでも閉じる。閉じるとき 150ms 程度の fade-out（なくても可）。
- 開くとき: 200ms の pop-in（opacity 0→1, scale .96→1）。keyframes は各css（mamakaji.css / oshigoto.css）に追加（例 `mkj-pop-in` / `osh-pop-in`）。`prefers-reduced-motion: reduce` では pop/twinkle/落下/floatを無効（オーバーレイ自体は表示）。
- a11y: `role="status"` + `aria-live="polite"`。フォーカストラップ不要（短命）。ボタンには可視フォーカスリング（--focus）。

## 配線
### ママ版 `MamaKajiPage.tsx`
- `cheer: { taskId: string } | null` state を追加。完了トグル時に `setCheer({taskId: id})`、dropTick++ は現状どおり。
- **ヒーローの JarGauge には dropTick を渡すのをやめる**（`KajiProgressHero` から dropTick prop 削除可）。落下演出はオーバーレイ内の大びんでのみ再生。ヒーローは count 反映のみ。
- 自動クローズ用タイマーは ref 管理・アンマウントでクリア（既存の plusOneTimer と同様）。連打時は前のタイマーをクリアして cheer を差し替え（dropTick が変わるので大びんの演出もリプレイされる）。
- 既存の「10個目は 800ms 遅延で SweetRevealModal」ロジックは維持。**reveal が開くタイミングで cheer を閉じる**（setCheer(null)）。オーバーレイ表示中でも reveal はその上（z-index上位）に出る。
- 行内の +1 float（showPlusOne）は残してよい（閉じた後リストに戻ったとき見える）。

### 娘版 `OshigotoPage.tsx`
- 同様に `cheer` state と `dropTick` state を追加（娘版は現在 dropTick が無い。MoonGauge は count で満ち欠けするので dropTick は**オーバーレイの再表示キー用途のみ**でよい）。
- **娘版にも「10個目は 800ms 遅延で ZombieRevealModal」を追加**（ママ版と同じ countRef ガード方式。現在は即時 setRevealed → 遅延に変更）。reveal が開いたら cheer を閉じる。

## 新規ファイル
- `features/mamakaji/components/KajiCheerOverlay.tsx`（props: task, count, dropTick, onUndo, onClose）
- `features/oshigoto/components/CheerOverlay.tsx`（props: task, count, onUndo, onClose）

## 受け入れ条件
- ママ版: 家事をタップ→**全画面に大きなびん**が出て、ふたが開きキャンディがころん＋「{一言}」「おつかれさま！」「N / 10個・あと◯個」。2秒で自動で閉じる／タップで即閉じ／「とりけす」でそのタスクが戻って閉じる。
- 娘版: 同様に**大きな月**＋「できたね！」。10個目はごほうび画面→（800ms）→ゾンビ登場。
- ママ版10個目: 大びんでキャンディ着地→（800ms）→おやつ登場（cheerは閉じる）。
- 取り消しトグルではオーバーレイが出ない。reduced-motionでも内容は読める。
- typecheck / build / 既存テスト21件 緑。backend・新規ライブラリなし。
