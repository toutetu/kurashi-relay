# 改修指示: カウントUIを「クイック記録」方式に合わせる(task-count-web 第2弾)

ユーザー指示(2026-07-17、実機確認後): おしごと/ママ家事のカウントUIは、ホームダッシュボードの
**「クイック記録」カード(`frontend/src/features/dashboard/components/QuickCards.tsx` の `QuickLogsCard`)と
同じ操作感**にする。コミット ab30b16 の「チェック丸の回数バッジ+専用−ボタン」案は破棄し、以下に差し替える。
`docs/wip/task-count/task-count-spec.md` §4-2 の見た目指定はこの文書が上書きする(§4-1/4-3/4-4 のロジックは有効)。

## 対象

- `frontend/src/features/oshigoto/components/TaskRow.tsx`(娘・おしごと)
- `frontend/src/features/mamakaji/components/KajiTaskRow.tsx`(母・家事)
- 必要に応じて `OshigotoPage.tsx` / `MamaKajiPage.tsx`(トースト設置)
- `useTaskPersistence.ts` のロジックは**変更しない**(incrementTask / decrementTask をそのまま使う)

## 行UI(QuickLogsCard の行を踏襲)

QuickCards.tsx の 194〜233 行目のパターンをそのまま移植する(色トークンだけ各画面のテーマに置換):

- **行全体が1つの `<button>`**。タップ = 常に `incrementTask(slug)`
- 行の中身(左→右): タスク名(`flex-1 truncate`)→ **回数ピル「N件」**
  (`key={count}` + `count-bump` アニメ、0件=グレー系 / 1件以上=テーマ色)→
  **丸い「+」アイコン**(`size-8 rounded-full`、装飾。lucide `Plus`)
- タップ時に「+1」フライアニメ(QuickCards の `fly` / 既存 `osh-plus-one` のどちらかに統一)
- **行内の専用「−」ボタンは削除する**(取り消しはトーストへ移動)
- 色: おしごとは `--osh-*` 系、ママ家事は現行のママ家事テーマ系を使う。
  ダッシュボードの `--primary-*` をそのまま持ち込まない
- aria: 行 = `aria-label="(タスク名)を記録。きょうN件"`。`aria-pressed` は使わない

## 取り消しトースト(QuickLogsCard の 239〜257 行目を踏襲)

- +1 のたびに画面下部固定のトースト(`role="status"` `aria-live="polite"`):
  「**(タスク名)を1件記録しました**」+「**取り消す**」ボタン(lucide `Undo2`)
- 5秒で自動で消える(タイマーは連打でリセット)
- 「取り消す」= そのタスクに `decrementTask(slug)` を1回呼ぶ(pending でも保存済みでも
  decrementTask 側が正しく処理する)→ トーストを閉じる
- トーストは各ページ(OshigotoPage / MamaKajiPage)に1つ。共通化してよいが過度な抽象化はしない

## テスト

- 既存テストのうち「−ボタン」を押す系を「トーストの『取り消す』を押す」に書き換える
- 追加: +1でトーストが出る/5秒で消える/「取り消す」で count が1減る
- `RecordsPage.test.tsx` は触らない

## 品質ゲート・完了条件

- frontend で lint / typecheck / test / build 全て緑になるまで修正
- **git commit はしない**(レビュー後に実施する)
- docs/ 以下は変更しない
- 完了時に変更ファイル一覧とゲート結果のサマリを出力する
