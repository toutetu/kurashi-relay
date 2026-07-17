# 修正指示: task-count-web 再レビュー指摘の修正(第4弾・最終)

Codex再レビュー(`docs/wip/task-count/codex-review-report-task-count-web-2.md`)の残指摘2件を修正する。
ブランチ `feat/task-count-web`(チェックアウト済み)。**git commit 禁止・docs/ 変更禁止**。

## 修正1(軽微): `--fly-color` を実際に設定する

`.fly` は `color: var(--fly-color, var(--primary))` になったが、`--fly-color` を設定する箇所が無く、
実表示は fallback の `--primary` のまま。

- `TaskRow.tsx` のフライ用 `<span className="fly ...">` に `[--fly-color:var(--osh-violet)]`
  (Tailwind の arbitrary property クラス)を追加(既存の text-* 色クラスは削除してよい)
- `KajiTaskRow.tsx` も同様に `[--fly-color:var(--mkj-rasp)]`(ママ家事テーマの主色。
  `--mkj-rasp` が存在しない場合は KajiTaskRow が実際に使っている `--mkj-*` の主色を使う)
- ダッシュボードの QuickLogsCard は無変更(fallback の `--primary` のまま)

## 修正2(中): 取り消し予約を operation id 単位にして、確定エラー時に破棄する

現状の `pendingUndoRef`(slug → 予約数)には2つの穴がある:

- 予約済み create が 422 等の**確定エラー**になっても予約が残り、
  次に同じタスクを正常に +1 したとき、その新しい record を誤って補償 cancel してしまう
- slug 単位のカウントなので、どの create に対する予約かが曖昧

方針: **予約を operation id 単位の `Set<string>` にする**(`pendingUndoRef = useRef(new Set<string>())`)。

- `decrementTask`: 対象タスクの pending create のうち、**未予約かつ in-flight** の最新のものを選んで
  その operation id を Set に追加する(`findLatestPendingCreate` を「予約済み id を除外して探す」形に
  拡張するか、呼び出し側でフィルタ)。
  - in-flight の create が全て予約済みなら、次の候補(未送信 create の除去 → `last_record_id` への
    cancel)へ進む。どの候補も無ければ何もしない(count ガードは現状どおり)
- `applyCreateResult`: `getOperationId(operation)` が Set にあれば削除して補償 cancel
  (現行ロジックと同じ: `result.record.id` へ cancel を enqueue して実行、+1反映と報酬はスキップ)
- `recoverFromDefinitiveError`: operation が create の場合、その operation id を Set から削除する
  (楽観減算済みの画面は既存の refetch で収束する)

## テスト追加

1. **確定エラー後の予約破棄**(Codex指摘の回帰シナリオ):
   POST保留 → トースト取り消し(予約)→ POST を 422 で確定失敗 → refetch で 0件 →
   同じタスクを再度 +1 → POST 成功 → **新しい record への DELETE が発行されない**こと・最終1件のこと
2. **二重予約の防止**: 同一タスクで +1 を2回(2つの create が in-flight)→ 取り消しを2回 →
   それぞれ別の create に予約され、両方に補償 DELETE が発行されること

既存テスト(39件)は全て緑を維持。

## 品質ゲート・完了条件

- frontend で lint / typecheck / test / build 全て緑(build がクラッシュした場合は1回再試行)
- 完了時に変更ファイル一覧と各ゲート結果のサマリを出力
