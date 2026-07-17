# Codex依頼: task-count-web 最終確認(3回目・短縮)

前回報告(`codex-review-report-task-count-web-2.md`)の残指摘2件を
`docs/wip/task-count/task-count-fix-02.md` の方針で修正した(作業ツリー未コミット)。
ブランチ `feat/task-count-web`。**ファイル変更・コミット禁止**(レポート新規作成のみ可)。

## やること(前回からの差分確認に絞る)

1. **品質ゲート4種を実行**(frontend/。build クラッシュ時は dist 削除→再試行)
2. **残指摘2件の修正検証**:
   - フライ色: `TaskRow` / `KajiTaskRow` の fly span に `--fly-color` が実際に設定され、
     build後CSSの後勝ちを考慮しても実表示がテーマ色になるか。QuickLogsCard は従来色のままか
   - 予約の operation id 化: `pendingUndoRef: Set<operationId>`・
     `findLatestPendingCreate` の予約済み除外・`recoverFromDefinitiveError` での予約破棄により、
     (a) 確定エラー後の古い予約が次の正常な +1 を消さないこと、
     (b) in-flight 2件をそれぞれ取り消すと別々の補償 DELETE になること
   - 回帰テスト2件の妥当性
3. 前回合格項目のデグレが差分に無いこと(差分ベースの確認でよい)

## 報告

`docs/wip/task-count/codex-review-report-task-count-web-3.md` に:
ゲート結果 / 修正検証の合否 / 新規指摘(あれば) / 総合判定(**マージ可 / 修正必要**)
