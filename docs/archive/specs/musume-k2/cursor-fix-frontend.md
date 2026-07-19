# Cursor修正依頼: K2 フロントエンド 重大2件(Codexレビュー)

Codexレビュー(`docs/wip/musume-k2/codex-review-frontend.report.md`)で**重大2件**が出ました。
以下だけをピンポイントで修正してください。**スコープ拡大禁止**。修正後に品質ゲートを再度実行して報告。

## 修正1: 振り返り保存の成功表示が保存完了を待っていない

対象: `frontend/src/features/musume/components/ReviewSheet.tsx`(94行目付近)と親コンポーネント。

現状の問題:
- 「確認おわり!」押下時、非同期保存(POST reflection/complete)の結果を**待たずに**即 `finished=true` にして
  成功メッセージ「ママに『確認完了』が届いたよ 🎀」を表示し、1.6秒後に閉じる。保存が失敗しても成功に見える。
- さらに `finished` が再オープン時にリセットされないため、失敗後に開き直すと「確認おわり!」ボタンが
  出ず再試行できない。

期待する挙動:
- 成功メッセージ表示とクローズタイマー開始は**保存成功(mutation resolve)後のみ**。
- 保存中はボタンを無効化(二重送信防止)。
- 保存失敗時は成功表示にせず、再試行可能な状態を保つ(**赤字/失敗色・せめる文言は使わない**。
  中立トーンで「うまく届かなかったみたい。もういちど押してね」程度。FR-M10順守)。
- シート再オープン時に `finished` 等のローカル状態をリセットする。

## 修正2: plan mutation成功時に musume-summary キャッシュを無効化していない

対象: `frontend/src/features/musume/queries.ts`(70行目・89行目付近の PATCH / PUT / reflection complete の
成功ハンドラ)。

現状の問題:
- mutation成功時に planキャッシュのみ更新し、母側の `musume-summary` クエリを invalidate していない。
  summaryのstaleTime 30秒の間、母画面に古い内容(「まだ決めてないよ」等)が残る。

期待する挙動:
- **全てのplan系mutation(PATCH plan / PUT items / POST reflection complete)の成功時に
  musume-summary クエリを invalidate** する(既存のqueryクライアント流儀で)。
  planキャッシュのサーバ応答確定(DR-010)は現状のまま維持。

## テスト追加(§8の範囲内・vi.fn fetchモック)

- 修正1の失敗経路: 保存失敗時に成功メッセージが出ないこと・再試行できること。
- 修正2: mutation成功後に summary が再取得される(invalidateされる)こと。

## やらないこと(スコープ外・触らない)

- Codex軽微指摘(summary取得エラーの中立表示・PUTテストの応答値分離・チャンクサイズ警告)は**今回対応しない**。
- 上記2修正+テスト以外のファイルに触らない。KoekakePage・koekake feature・oshigoto等は変更しない。

## 完了条件(自分で実行して結果を報告に貼る)

```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

- lint / typecheck / test 緑必須(テスト件数を貼る)。buildはWindowsネイティブクラッシュ(-1073740791)のみ許容
  (それ以外のエラーは直す)。
- 触ったファイル一覧を報告する。コミット・pushはしない。
