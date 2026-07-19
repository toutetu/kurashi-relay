# Codexレビュー依頼: K1 声かけリマインダー フロントエンド

あなた(Codex)はコードレビュー/セカンドオピニオン担当です。Cursorが実装した K1 フロントエンドを
**独立レビュー**し、品質ゲートを**自分で再実行**して合否を報告してください。

## 対象

- ブランチ: `feat/koekake-frontend`(コミット済み `544fc84`。`main` との diff を対象)
- スペック(唯一の正): `docs/wip/koekake-k1/koekake-k1-spec.md` の「フロントエンド(PR2)」章 §7〜§8
- 実装ファイル: `frontend/src/pages/KoekakePage.tsx`・`frontend/src/features/koekake/`・
  `frontend/src/api/koekake.ts`・`frontend/src/api/schemas/koekakeSchema.ts`。
  既存変更は `App.tsx`・`AppShell.tsx`・`api/client.ts`(apiSend に PATCH 追加)のみのはず。

## やること

### 1. 品質ゲートの再実行(必ず自分で実行し結果を貼る)

```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

各コマンドの pass/fail・件数を報告に貼る。

**特に `npm run build` の切り分けを重視**: Cursorの報告では `tsc -b` は成功するが `vite build` が
Windows で `STATUS_STACK_BUFFER_OVERRUN`(exit -1073740791)で異常終了した。これが
**(a) koekakeのコード起因なのか / (b) この環境固有(Vite/Rollupのネイティブ問題)で main でも起きるのか**を
切り分けてほしい。手順の一案:
- まず `feat/koekake-frontend` で `npm run build` を実行し再現するか確認。
- 次に `git stash -u`(または `main` を別チェックアウト)して **koekake変更なしの状態で `npm run build`** を実行し、
  同じクラッシュが出るか確認 → 出れば環境要因(コード起因でない)、出なければ koekake 起因。
- 終わったら必ず元の状態に戻す(stash pop 等)。
- 判定(環境要因 or コード起因)を根拠付きで報告。コード起因なら原因箇所を特定。

### 2. スペック適合レビュー(§7〜§8)

- **API契約の一致**: `koekakeSchema.ts` の zod スキーマが**実バックエンドの実際のJSON**
  (`backend/app/Http/Controllers/Api/Koekake/` と各 Service。特に `KoekakeTaskService` の
  listTasks / showTask、`response()->json(...)` の形)と一致しているか。エンベロープ有無・キー名・
  null許容・completion/suggested_prompt の形。runtime で safeParse が通るか(テストのモックではなく実形と照合)。
- **サーバ値優先(DR-008/010)**: mutation 応答の prompt_count / latest_prompt_at / suggested_prompt /
  completion / next_remind_at で**キャッシュを確定**しているか(楽観値のまま放置していないか)。
- **タスク単位の直列化**: 同一 daily_task への「声かけ済み」連打が並行POSTにならず直列化されるか
  (`features/koekake/queries.ts` の `enqueueTaskMutation` 等)。idempotency_key が押下ごとに新規採番か。
  Undo(cancel)や completion/snooze の並行安全性に穴がないか。
- **画面要件**: 朝/夕方/夜タブの現在時刻初期選択(4–10:59朝 / 11–17:59夕方 / 18–3:59夜)、
  声かけ済み主ボタン+10秒Undo(控えめ・DR-018)、5分後snooze、期限到来カード強調、
  詳細シート(履歴・level別候補template/edited/custom・再通知・行動結果6択)。
- **デザイン**: 母用寒色を既存トークン(`--mother-blue*`)で表現し、**画面固有カラーコードの新設が無い**こと。
  娘側画面に声かけ回数を出していないこと。

### 3. 既存への影響

- 変更した既存ファイルが `App.tsx`・`AppShell.tsx`・`api/client.ts`(apiSend の method 型に PATCH 追加)
  だけに収まっているか。既存の画面・feature・API関数・テストに実質変更が無いか。

## 報告フォーマット

1. ゲート4種の実行結果(件数付き)+ **build クラッシュの切り分け判定(環境 or コード)**
2. 重大(マージ前に修正必須) / 軽微(後で可) / 指摘なしの3分類
3. API契約の一致/不一致の具体箇所
4. マージ可否の総合判断

コミット・pushはしない。レポートのみ。
