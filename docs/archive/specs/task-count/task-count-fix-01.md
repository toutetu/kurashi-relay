# 修正指示: task-count-web レビュー指摘の修正(第3弾)

Codexレビュー(`docs/wip/task-count/codex-review-report-task-count-web.md`)の指摘のうち、
**重大1・重大2・軽微1 を修正する**。中1(連打時のPOST並列・応答逆転)は既知の並行系バックログへ
回すため**今回は着手しない**。ブランチ `feat/task-count-web`(チェックアウト済み)。
**git commit 禁止・docs/ 変更禁止**。

## 修正1(重大1): 送信中(in-flight)の create を取り消したとき、サーバに記録が残る問題

現状: `decrementTask` は `findLatestPendingCreate` でキューにある create を見つけると
`removeOperation` するだけで終わる。しかし `incrementTask` は enqueue 直後に `runCreate` を
起動しており、POST 完了までキューに残るため、「送信中」の create も「未送信」と誤判定される。
POST が成功するとサーバに有効レコードが残るのに、画面カウントは減ったままになる。

方針(補償キャンセル方式。旧トグル実装の `stillDone` 補償と同じ発想):

- `useTaskPersistence` に「取り消し予約」を持つ: `pendingUndoRef = useRef(new Map<string, number>())`
  (key = task slug、value = 予約数)。
- `decrementTask` で対象タスクの最新 pending create が **in-flight**(= `inFlightRef` に
  その operation id が含まれる)場合は、キューから消さずに `pendingUndoRef` の該当 slug を +1 し、
  楽観 count-1 / summary 減算だけ行う。
  in-flight でない(まだ送信していない)create は現状どおり `removeOperation` でよい。
- `applyCreateResult` の先頭で `pendingUndoRef` の該当 slug が 1 以上なら: -1 して、
  その `result.record.id` への `PendingCancel` を enqueue → `runCancel`(または flush)を起動し、
  **カウント・summary への +1 反映はしない**(すでに楽観減算済みのため。二重減算しないよう注意)。
  報酬演出(`scheduleReward`)もこの場合はスキップする。
- cancel 確定後は既存の `applyCancelResult` の refetch 収束に乗せる。

## 修正2(重大2): CheerOverlay とトーストで二重取り消しできる問題

- 「最後の +1 を取り消す」処理を1つの関数(例 `undoLastIncrement()`)に集約し、
  **`lastAction` を消費できたときだけ** `decrementTask` を呼ぶ(消費は1回限り)。
- CheerOverlay の `onUndo` もトーストの「取り消す」も、この共通関数を呼ぶ。
  どちらかで取り消したら `lastAction` を null にし、CheerOverlay も閉じる
  (トースト側で取り消した場合も `setCheer(null)`)。
- OshigotoPage / MamaKajiPage の両方に適用する。

## 修正3(軽微1): +1 フライアニメの色がテーマ色にならない

`frontend/src/index.css` の `.fly` が `color: var(--primary)` を持ち、コンポーネント側の
テーマ色指定より後勝ちする。`.fly` から固定 `color` を外して呼び出し側のクラスで色を指定するか、
`.fly { color: var(--fly-color, var(--primary)) }` にして各行で `--fly-color` を渡す。
ダッシュボードのクイック記録(既存利用箇所)の見た目を壊さないこと。

## テスト追加(Codex指摘の 1・2)

1. **in-flight 取り消しの収束**: POST を保留にしたまま +1 → トースト「取り消す」→ POST 成功、
   の順で解決したとき、cancel(DELETE)が発行され、最終的に画面カウント 0 件・サーバ相当の
   モックも 0 件に収束すること
2. **二重取り消し防止**: CheerOverlay の「もどす」とトーストの「取り消す」を続けて押しても、
   decrement / DELETE が合計1回しか起きないこと

既存テストは全て緑を維持する。

## 品質ゲート・完了条件

- frontend で lint / typecheck / test / build 全て緑(build が环境クラッシュした場合は1回再試行)
- 完了時に変更ファイル一覧と各ゲート結果のサマリを出力
