# Codex最終確認依頼: K1フロント Undo競合 残2件の解消確認

前回の Codex再レビューで「解消2・不十分2」と判定。Cursorが**不十分だった2件**(下記)を作業ツリー上で
追加修正した。**この2件が解消したかだけ**を確認し、ゲートを再実行してマージ可否を報告してほしい。
(既に「解消」判定済みの直列化・詳細invalidateは再確認不要だが、リグレッションがないかは見てよい。)

対象: `feat/koekake-frontend` の作業ツリー未コミット変更。修正指示書 `docs/wip/koekake-k1/cursor-fix-frontend-2.md`。

## 確認する2点

1. **取消中/再取得前の古い推奨文送信(前回「不十分」)**
   - cancel の `onSuccess` で一覧・詳細の invalidate を **await** し、再取得完了まで解決を待つか
     (`void`破棄をやめたか)。`frontend/src/features/koekake/queries.ts`。
   - **取消中〜再取得完了まで、そのタスクの「声かけ済み」ボタン(と詳細シートの声かけ操作)が
     disabled** になるか。`KoekakePage.tsx`・`KoekakeTaskCard.tsx`・`KoekakeDetailSheet.tsx`。
   - 送信本文が最新キャッシュ(`getQueryData`)から作られ、再取得前に古い level を送れないか。

2. **Undoトーストのタイマー競合(前回「不十分」)**
   - Undo押下時に10秒自動消滅タイマーを**即停止**し、DELETE解決まで「取り消し中…」で表示継続するか。
   - **失敗時はトーストを残し、エラー + [再試行]** を出すか。`KoekakeUndoToast.tsx`・`KoekakePage.tsx`。

追加テスト(`KoekakePage.test.tsx`)が上記2点(特に「DELETE遅延+10秒経過でもトースト残存」「再取得前は
ボタン無効・再取得後は新level送信」)を実際に検証しているかも確認する。

## ゲート(再実行して件数を貼る)

```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run build` は環境依存のネイティブクラッシュ(exit -1073740791)が出ることがあるが、前回の切り分けで
環境要因と確定済み。`tsc -b` 成功 + Vite がモジュール変換到達ならコード起因でないと明記してよい。

## 報告
1. 2点それぞれ「解消/未解消」+根拠(該当行)
2. リグレッション・新規指摘(あれば)
3. ゲート結果(件数)
4. **マージ可否の総合判断**

コミット・pushはしない。作業ツリーは触ったら元に戻す。
