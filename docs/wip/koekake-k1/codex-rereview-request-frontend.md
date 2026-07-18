# Codex再レビュー依頼: K1フロント 修正4件の確認

先の Codexレビュー(`docs/wip/koekake-k1/codex-review-frontend.log`)で挙げた重大4件を、Cursorが
`feat/koekake-frontend` の作業ツリー上で修正した。**修正が正しく解消しているかを確認**し、品質ゲートを
再実行してマージ可否を報告してほしい。

対象は**作業ツリーの未コミット変更**(`git status` の M 群)。修正指示書は
`docs/wip/koekake-k1/cursor-fix-frontend.md`。

## 確認してほしい4点(前回の重大指摘)

1. **Undo後の推奨文残留**: cancel(DELETE)成功後に一覧を invalidate/refetch し、サーバ再計算の
   `suggested_prompt` で確定しているか。取消→次の押下で古い level の文を送らないか。
   `frontend/src/features/koekake/queries.ts`。
2. **直列化がPOSTのみ→全mutation**: cancel / completion / snooze も同一 daily_task の
   `enqueueTaskMutation(taskId, ...)` に載ったか。応答逆順で古い `next_remind_at`/完了状態が
   新しい値を上書きしないか。cancel が taskId を受け取る形になったか。
3. **詳細キャッシュ未更新**: create/cancel/completion/snooze 後に `koekakeTaskQueryKey(taskId)` を
   invalidate し、詳細シートの履歴・候補が最新化されるか。
4. **保存失敗の非通知**: POST/PATCH/DELETE 失敗時にユーザー可視のエラー表示が出るか。Undo は
   DELETE 成功後にトーストを閉じ、失敗時はトーストが残り再試行手段があるか。`onError` でキャッシュを
   サーバ値へ戻しているか。`frontend/src/pages/KoekakePage.tsx`・`KoekakeUndoToast.tsx`。

追加テスト(`KoekakePage.test.tsx`)が上記を実際に検証しているかも見る。

## 品質ゲート(再実行して結果を貼る)

```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

- `npm run build` は前回 Windows で `STATUS_STACK_BUFFER_OVERRUN`(exit -1073740791)が出たが、
  前回の切り分けで**ブランチ・main とも成功=環境/ネイティブbinding側の非決定的異常**と判定済み。
  今回も同様に環境要因なら「コード起因でない」と明記してよい(再度の main 切り分けまでは不要。
  ただし tsc -b が通り、Vite がモジュール変換まで到達していることは確認する)。

## 報告

1. 4点それぞれ「解消/未解消/不十分」の判定 + 根拠(該当行)
2. 新たに見つかった重大・軽微(あれば)
3. ゲート結果(件数)
4. マージ可否の総合判断

コミット・pushはしない。レポートのみ。作業ツリーは触った場合必ず元に戻す。
