# Codex依頼: task-count-web 修正後の再レビュー(最終確認)

前回レビュー(`codex-review-report-task-count-web.md`)の指摘に対し、
`docs/wip/task-count/task-count-fix-01.md` の方針で修正を実施した(作業ツリー未コミット)。
ブランチ `feat/task-count-web`。**ファイル変更・コミット禁止**(レポート新規作成のみ可)。

## やること

1. **品質ゲート4種を実行**(frontend/)。build がクラッシュ(0xC0000409)した場合は2回まで再試行し、
   成否と要点を報告(前回のあなたの実行では初回成功していた)
2. **修正検証**(前回指摘との突き合わせ):
   - 重大1: in-flight create の取り消しが `pendingUndoRef` 予約 → `applyCreateResult` で
     補償 cancel(record.id への DELETE)になり、画面0件・サーバ0件へ収束するか。
     予約消費時に +1 反映や報酬演出が走らないか。予約が複数(連打)でも整合するか
   - 重大2: `undoLastIncrement()` への一本化で、CheerOverlay とトーストの併用でも
     decrement が1回に限定されるか(OshigotoPage / MamaKajiPage 両方)
   - 軽微1: `.fly` の `--fly-color` 変数化で各画面テーマ色になり、
     ダッシュボードのクイック記録は従来色のままか
   - 新規テスト2件(in-flight取り消し収束・二重取り消し防止)の妥当性
3. **デグレ確認**: 前回「合格」だった項目(行UI・スキーマ・/records互換・既存テスト)が
   維持されているか(差分ベースの確認でよい)

※前回の中1(POST並列・応答逆転)は今回スコープ外(バックログ送り決定済み)。再指摘不要。

## 報告

`docs/wip/task-count/codex-review-report-task-count-web-2.md` に:
ゲート結果 / 修正検証の合否(項目別) / 新規指摘(あれば) / 総合判定(**マージ可 / 修正必要**)
