# Codex再レビュー依頼: K2 フロントエンド 重大2件修正の確認

前回レビュー(`docs/wip/musume-k2/codex-review-frontend.report.md`)の**重大2件**を、Cursorが
`docs/wip/musume-k2/cursor-fix-frontend.md` に沿って修正済みです。**修正の妥当性のみ**確認し、
マージ可否を再判定してください。全面再レビュー不要(前回「指摘なし」項目・軽微3件の再確認は不要。
軽微は「後で可」の判定のままでよい)。

## 確認する点

1. **振り返り保存の同期化**: `frontend/src/features/musume/components/ReviewSheet.tsx` /
   `MusumeHome.tsx` で、成功表示とクローズタイマーが**保存成功後のみ**動くこと・保存中ボタン無効化・
   失敗時は中立文言(せめない・FR-M10違反なし)で再試行可能・再オープン時に状態リセット
   (`key={resetKey}` リマウント方式)が機能すること。
2. **summary invalidate**: `frontend/src/features/musume/queries.ts` で PATCH plan / PUT items /
   reflection complete の**全mutation成功時**に musume-summary が invalidate されること。
   planキャッシュのサーバ応答確定(DR-010)が壊れていないこと。
3. **追加テスト**: `MusumePage.test.tsx`(失敗経路・再試行・再オープン)と `queries.test.tsx`(summary再取得)が
   修正前実装なら落ちる内容か。
4. **スコープ**: 今回触ったのが上記5ファイル(ReviewSheet / MusumeHome / queries.ts / MusumePage.test.tsx /
   queries.test.tsx 新規)のみで、KoekakePage・koekake feature・他画面に副作用が無いこと。
5. **品質ゲート再実行**(件数付きで貼る):
   ```
   cd frontend
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
   (buildはあなたの環境では前回2回PASS。今回も結果を明記)

## 報告

- 修正2点の可否・追加テストの実効性
- ゲート結果(件数)
- **マージ可否の総合判断**(可なら明記)

コミット・pushはしない。レポートのみ。
