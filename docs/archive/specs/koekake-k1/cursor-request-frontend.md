# Cursor実装依頼: K1 声かけリマインダー フロントエンド(`/koekake`)

あなた(Cursor composer-2.5)への実装依頼です。厳密に守って実装してください。

## 読むべきスペック(唯一の正)

`docs/wip/koekake-k1/koekake-k1-spec.md` の **「フロントエンド(PR2)」章(§7〜§8)** を実装する。
本依頼書はその要約+既存パターンの案内。**スペック本文が正**。食い違いはコメントで明示して止める。

バックエンドAPI(`/api/koekake/*`)は**実装・デプロイ・migrate済み**。API契約はスペック§4を正とするが、
実レスポンス形は `backend/app/Http/Controllers/Api/Koekake/` と各 Service / `KoekakeTaskService` を
読んで**実装済みの実際のJSON形に合わせる**こと(zodスキーマは実レスポンスに一致させる)。

## 作るもの(frontend/ 配下・React + TypeScript + Vite + TanStack Query)

### 1. ルート追加
- `frontend/src/App.tsx` に `<Route path="koekake" element={<KoekakePage />} />` を追加。
- `frontend/src/components/layout/AppShell.tsx` の `navigation` 配列と `pageTitles` に「声かけ」を追加
  (母向け導線)。アイコンは lucide-react から適切なもの(例: `MessageCircleHeart` や `Bell`)。
  `mobileNavigation`(5枠)への追加要否はレイアウトを見て判断(無理に押し込まない)。

### 2. API層 `frontend/src/api/koekake.ts` + `frontend/src/api/schemas/koekakeSchema.ts`
- 既存 `api/oshigoto.ts` + `api/schemas/oshigotoSchema.ts` の**zodによる safeParse パターンを踏襲**。
- エンドポイント関数: `getKoekakeTasks(date?, phase?)` / `getKoekakeTask(id)` /
  `createPromptEvent(body)` / `cancelPromptEvent(id)` / `updateCompletion(id, body)` / `snooze(id, body)`。
- **`api/client.ts` の `apiSend` は現在 `"POST" | "DELETE"` のみ**。`completion` は PATCH なので、
  **`apiSend` の method 型に `"PATCH"` を追加**する(既存の POST/DELETE 呼び出しには影響しない最小変更)。
  これは許可された既存ファイル変更。

### 3. 通信フック `frontend/src/features/koekake/queries.ts`
- `features/taskRecords/queries.ts` の**TanStack Query パターンを踏襲**(useQuery / useMutation /
  queryKey / invalidateQueries)。
- **mutation はタスク単位で直列化**する(同一 daily_task への「声かけ済み」連打で並行POSTしない。
  タスクIDごとに直近のPromiseを鎖にする等)。**サーバ応答値(prompt_count/latest_prompt_at/
  suggested_prompt)で state を確定**する(楽観的加算をサーバ値で上書き。DR-008/DR-010)。
- idempotency_key はフロントで採番(`crypto.randomUUID()`。押下ごとに新規)。

### 4. 画面 `frontend/src/pages/KoekakePage.tsx` + `frontend/src/features/koekake/components/`
スペック §7-2(M-01 一覧)・§7-3(M-02 詳細シート)を実装。要点:
- **時間帯タブ 朝/夕方/夜**。現在時刻で初期選択(4:00–10:59=朝 / 11:00–17:59=夕方 / 18:00–3:59=夜)。
  既存 `components/ui/SegmentedTabs.tsx` を参考にする。ただしそれは `xl:hidden`(モバイル専用)・
  id が `dashboard-*` 固定なので、**そのまま流用できなければ koekake 用に汎用タブを作る**
  (デスクトップでもタブが見える形に)。
- タスクカード: アイコン・タスク名・声かけ回数(「声かけ 2回」)・最新時刻・次回通知(あれば)・
  推奨文(suggested_prompt.text)・完了バッジ。ボタン **[声かけ済み](主ボタン) [5分後] [詳細]**。
- 「声かけ済み」= 最も押しやすい主ボタン。押下→+1フライ演出(既存 `--fly-color` や
  index.css の演出パターンを流用可)→**10秒Undoトースト(控えめな見た目・DR-018準拠)**。
  Undo で cancelPromptEvent → サーバ値でカード更新。
- [5分後] = snooze(minutes:5)。応答 next_remind_at を反映。
- **期限到来の強調**: 未完了かつ(next_remind_at が過去 または prompt_count=0 かつ scheduled_at が過去)の
  カードを既存トークンの範囲で強調(新規カラーコード禁止)。
- **回数は中立表示**(「就寝 4回」を失敗色・警告色にしない)。
- **M-02 詳細シート**(ボトムシート/モーダル): getKoekakeTask で 履歴・level別候補・完了6択を表示。
  候補操作(この文で声かけ済み/編集して声かけ済み=source:edited/自由入力=source:custom)・
  再通知[5分後][10分後][15分後][今日はもう通知しない]・行動結果6択(PATCH completion)。
  シート内操作もサーバ応答値で一覧へ反映。

### 5. デザイン(スペック §7-4)
- 母用は**落ち着いた寒色**。既存トークン **`--mother-blue` / `--mother-blue-strong` / `--mother-blue-soft`**
  (`frontend/src/styles/tokens.css` に既存)を使う。**画面固有のカラーコード新設は禁止**。
- 既存の Tailwind + CSS変数の書き方に合わせる。母用ワイヤーフレーム
  `docs/archive/requirements/くらしリレイ_ワイヤーフレーム_母用詳細.png` を正とする。
- 娘側画面(既存 /oshigoto 等)には一切触らない。声かけ回数を娘側に出さない。

### 6. テスト `frontend/src/features/koekake/*.test.tsx`(スペック §8 の1〜7)
- **既存のテスト方式に合わせる**: `features/oshigoto/OshigotoPersistence.test.tsx` と同様に
  **`vi.fn<typeof fetch>()` で fetch をモック**し、`test/renderApp.tsx` の `renderApp(path)` で描画する。
  スペックは「vitest+MSW」と書くが、**このプロジェクトは MSW ではなく fetch モック方式**なのでそれに従う
  (バックエンドで Pest→PHPUnit に合わせたのと同じ判断)。理由をテスト冒頭コメントに残す。
- カバー: 一覧描画 / 声かけ済みでサーバ値優先の更新 / 連打の直列化(並行しない・key毎回異なる) /
  Undo で DELETE→回数戻り / completion バッジ / snooze の next_remind_at / タブ初期選択(時刻モック)。

## 絶対に守ること
- 既存の画面・feature・API関数に触らない(変更してよい既存ファイルは `App.tsx`・`AppShell.tsx`・
  `api/client.ts` の apiSend method 型のみ)。
- サーバ応答値を唯一の真実として state を上書きする。楽観更新はしてよいが確定はサーバ値。
- 文言・ラベルはスペック/バックエンド由来のものを使い、勝手に作らない。

## 完了条件(すべて自分で実行して緑にしてから報告)
```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```
- 各結果(pass/fail・件数)を報告に貼る。落ちたら直してから報告。
- 実装ファイル一覧・スペックから逸脱した点(あれば)を報告。
- **コミット・pushはしない**(Fableがレビュー後に行う)。
