# Codex レビュー依頼 03: Phase 5 フロント永続化

## 対象

- ブランチ: `feature/oshigoto-persistence-frontend`
- 差分の見方: `git diff docs/phase6-results...HEAD -- frontend/`(frontendのみ対象。`c040430` の daily-log 変更はスコープ外なので無視)
- 実装スペック(前提): `docs/deploy_change/oshigoto-persistence-frontend-spec.md`
- 設計判断: `docs/design-decisions.md` の **DR-008**(サーバsummaryを唯一の真実にする)
- バックエンド契約: `docs/deploy_change/oshigoto-persistence-backend-spec.md` §5、本番試験結果 `docs/deploy_change/phase6-results.md`

## レビューの主眼(親指示書 §6.3「Codexへ特に確認させる項目」)

フロント側の永続化ロジックについて、**並行・再送・境界のバグ**を重点的に。

1. **再送で二重加算されないか**: 楽観的更新→POST→レスポンスsummaryで確定同期。同一操作の連打・オフライン再送で `idempotency_key` が固定され、ゲージ/ポイント/コインが二重に増えないか。
2. **取消の整合**: 完了→取消でゲージ/今日数が正しく戻るか。取消後に古い create キーが再送されても完了が復活しないか(backend側は phase6 #8 で実証済み。フロントがそれを崩さないか)。
3. **作成中に取消した競合**: create のレスポンスが返る前に同じタスクを OFF にした場合(`useTaskPersistence.ts` の `applyCreateResult` の `stillDone` チェック / `findPendingCreate` によるキュー除去)、record が宙に浮かず正しく cancel 補償されるか。
4. **報酬リビールの二重防止**: `milestone_number` による `wasRewardRevealed`/`markRewardRevealed` で、同一節目の再送・再マウントで演出が二度出ないか。タイマー(800ms)とアンマウントの後始末。
5. **ゲージ折り返しの整合**: 楽観値 `min(size, count+1)` / 取消 `(count-1+size)%size` と、サーバ `gauge_count = lifetime%10`、`gaugeOverride` による満タン保持→`closeReveal` で解除、の整合。ローカルで残高を勝手に加減算していないか(DR-008)。
6. **日付境界(JST)**: リクエストは `date` 省略でサーバJST当日に委譲。localStorageキーはレスポンスの `date` 由来。日跨ぎでキュー/スナップショットが壊れないか。mutation経路(date省略)と flush経路(operation.date付き)の非対称の是非。
7. **localStorage堅牢性**: `oshigotoStorage.ts` の zod検証・try/catch(容量超過/無効環境)、キュー冪等(`enqueueOperation` の重複防止、`getOperationId`)、スナップショットの `initialData` 復元。
8. **エラー分類**: `isTransientApiError`(status 0 / >=500 のみ再試行、422/409 は確定エラーで `refetch` 復旧)の妥当性。楽観的UIを失わせない設計になっているか。

## 主要ファイル

- `frontend/src/features/taskRecords/useTaskPersistence.ts`(中核)
- `frontend/src/features/taskRecords/queries.ts`
- `frontend/src/api/oshigotoStorage.ts`
- `frontend/src/api/oshigoto.ts` / `frontend/src/api/client.ts`(`apiSend`)
- `frontend/src/api/schemas/oshigotoSchema.ts`
- `frontend/src/pages/OshigotoPage.tsx` / `MamaKajiPage.tsx` / `features/mamakaji/context/MamaKajiContext.tsx`

## 前提(手戻り防止)

- backend/ とダッシュボード/スケジュール/共通UIの見た目・演出は変更しない方針。
- 図鑑/USJ/グッズは今回スコープ外(Phase 5b)。指摘は当日タスク永続化に限定。
- Fable側で lint/typecheck/test(28)/build 緑・dev serverで 0始まり表示&責めないエラーUI を確認済み。**再実行は不要**。コードの並行/整合レビューに集中してほしい。

## 出力

`docs/deploy_change/codex-review-report-03.md` に、**重大度順**(重大/中/軽微)で findings を書く。各項目: 事象 / 該当ファイル・行 / 具体的な失敗シナリオ(入力→誤結果) / 推奨修正。問題なければ「重大なし」と明記。**コードの修正はせず、レポートのみ**。
