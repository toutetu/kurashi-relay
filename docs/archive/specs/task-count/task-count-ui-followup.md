# 実装指示: カウントUIの実機フィードバック修正(followup)

実機確認したユーザーの指摘(2026-07-17)。判断=DR-017。ブランチ `fix/task-count-ui-followup`
(最新mainから作成済み・チェックアウト済み)。フロントのみ。**git commit 禁止・docs/ 変更禁止**。

## 背景(現状の問題)

`/oshigoto`・`/mama-kaji` は、タスクをタップすると **取り消し導線が2つ** 出ている:

1. **キラキラ画面(CheerOverlay / KajiCheerOverlay)内の「↩ とりけす」** — 控えめなテキストリンク。
   `AUTO_CLOSE_MS = 2000ms` でオーバーレイごと自動で閉じる。
2. **画面下部の黒帯トースト**(`lastAction` state + `Undo2` + 白ボタン「取り消す」) — 目立つ上に、
   5000ms 出るのでキラキラ画面(2秒)が閉じた後も居残る。

ユーザー要望:「取り消しマークは(1)目立たない形に、(2)表示時間は月のキラキラ画面と同じ長さに、
(3)元の画面に戻ったら表示されていないように」。→ これは①のオーバーレイ内取り消しが既に満たす。
**②の下部トーストを撤去し、取り消しを①に一本化する。**

さらに、カウントのピルが速い連打で「1件 2件 3件 4件」と残像で並ぶ(`key={task.count}` による
要素の作り直し)。**常に1個だけ表示**に直す。

## 修正1: 下部トーストの撤去(取り消しはキラキラ画面に一本化)

対象: `frontend/src/pages/OshigotoPage.tsx`、`frontend/src/pages/MamaKajiPage.tsx`(同じ構造)。

- 画面下部トーストの JSX ブロック(`{lastAction && ( ... )}` 全体)を削除。
- `lastAction` state、`undoTimer` ref、`handleIncrementTask` 内の `lastAction`/`undoTimer` 設定、
  `undoLastIncrement` 関数、`undoTimer` 用の cleanup `useEffect` を削除。
- `handleIncrementTask` は次のように簡素化(increment + キラキラ表示 + dropTick のみ):
  ```tsx
  const handleIncrementTask = (id: string) => {
    incrementTask(id);
    setCheer({ taskId: id });
    setDropTick((tick) => tick + 1);
  };
  ```
- オーバーレイの `onUndo` を、現在のキラキラ対象タスクを直接取り消す形へ:
  `onUndo={() => decrementTask(cheer.taskId)}`(オーバーレイ側が続けて自分を閉じるので
  `setCheer(null)` は不要。二重取り消し防止は「オーバーレイが1回開くごとに1つ」の構造で担保される)。
- 未使用になった import(`Undo2`、`Button`)を削除。
- **キラキラ画面内の「↩ とりけす」テキストリンクはそのまま残す**(これが唯一の取り消し導線)。
  これで (1) 目立たない (2) キラキラ画面と同じ2秒 (3) 閉じたら消える、を全て満たす。

注意: in-flight 中のタップを取り消す補償ロジック(`useTaskPersistence` の `pendingUndoRef` 等)は
`decrementTask` 経由で従来どおり機能する。ロジック側(`useTaskPersistence.ts`)は変更しない。

## 修正2: カウントピルの残像を解消(常に1個)

対象: `frontend/src/features/oshigoto/components/TaskRow.tsx`、
`frontend/src/features/mamakaji/components/KajiTaskRow.tsx`。

- 回数ピルの `<span key={task.count} className="count-bump ...">` から **`key={task.count}` を削除**し、
  要素を作り直さず中身(数字)だけ更新する。これで連打しても常にピルは1個。
- `count-bump` クラスは remount しなくなり実質無効になるため、**外してよい**
  (タップのフィードバックは `+1` フライアニメとキラキラ画面が担う)。ピル自体は静かに数字が変わる形でよい。
- `+1` フライ(`fly` span、`flyKey`)はそのまま残す。

## テスト

- `OshigotoPersistence.test.tsx` ほかで、下部トースト前提のテスト
  (「取り消す」ボタン / 「1件記録しました」/ 5秒 / CheerOverlay+トーストの二重取り消し)を、
  **キラキラ画面の「↩ とりけす」経由の取り消し**に置き換える。
- 残すべき担保: (a) 「↩ とりけす」で count が1減り DELETE される (b) in-flight タップの
  「↩ とりけす」取り消しが POST 確定後に補償 DELETE される (c) ピルが常に1個
  (同一行に複数のカウント表示ノードが無い)。
- 既存の increment / スキーマ / records 系テストは緑を維持。

## 品質ゲート・完了条件

- frontend で lint / typecheck / test / build 全て緑(build がクラッシュしたら dist 削除して再試行)。
- 完了時に変更ファイル一覧と各ゲート結果のサマリを出力。
