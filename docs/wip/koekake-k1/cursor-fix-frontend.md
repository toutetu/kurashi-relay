# Cursor修正依頼: K1フロント Codexレビュー指摘の重大4件を修正

Codexレビューで検出された**重大4件**を修正してください。対象は `feat/koekake-frontend` ブランチ
(コミット済み)。以下だけを直し、無関係な変更はしない。

共通方針: **サーバ応答値を唯一の真実にする(DR-008/DR-010)**。楽観更新はしてよいが、確定はサーバ値。
書き込み後は一覧・詳細のキャッシュを**サーバと整合**させる。

## 修正1: Undo(取消)後に推奨文が古いまま残る

`frontend/src/features/koekake/queries.ts` の `applyPromptEventResponse` は、DELETE応答に
`suggested_prompt` が含まれないため取消後もカードの推奨文を更新しない。回数は0に戻るのに level2 の文が
残り、次の「声かけ済み」で誤った文を送る。

**修正**: 取消(cancelPromptEvent)成功後、**一覧クエリ `koekakeTasksQueryKey(date, phase)` を
invalidate して再取得**し、サーバが再計算した `suggested_prompt`(と prompt_count/latest_prompt_at)で
確定させる。楽観的にカードを即時更新するのは可だが、最終確定は refetch のサーバ値。
(作成POST側は応答に suggested_prompt を含むので現状のままでよいが、詳細キャッシュは修正3で扱う。)

## 修正2: mutation直列化が「声かけ作成」だけ

`enqueueTaskMutation` で直列化しているのは createPromptEvent のみ。**cancel / completion / snooze も
同一 daily_task の直列キューに載せる**。特に cancel は現在 promptEventId しか受け取らないため、
**taskId(daily_task_id)も渡して `enqueueTaskMutation(taskId, ...)` に入れる**。
completion / snooze も taskId で同じキューへ。応答の逆順到着で古い `next_remind_at` や完了状態が
新しい値を上書きしないようにする。

## 修正3: 詳細シートのキャッシュが声かけ作成・取消後に更新されない

create / cancel 後に一覧しか更新せず、`koekakeTaskQueryKey(taskId)`(詳細)の履歴・候補が古いまま
(staleTime 10秒)。**create/cancel/completion/snooze の成功後に、対象タスクの詳細クエリ
`koekakeTaskQueryKey(taskId)` を invalidate** して、詳細シートを開き直したとき最新の履歴・
suggested になるようにする。

## 修正4: 保存失敗がユーザーに伝わらない

POST/PATCH/DELETE の失敗(例外/rejected Promise)が握り潰され、ユーザーに通知されない。特に Undo は
DELETE 成功前にトーストを消すため、取消失敗時に戻す手段がない。

**修正**:
- 各 mutation に `onError` を付け、**ユーザー可視のエラー表示**を出す(既存の `components/ui/AsyncStates.tsx`
  や既存のトースト/エラーパターンに合わせる。新しいデザイン言語を作らない)。
- Undo は **DELETE 成功を待ってからトーストを閉じる**(または失敗時はトーストにエラーを表示して
  再試行/継続手段を残す)。`KoekakePage.tsx:74` 付近・`108` 付近の握り潰しを解消。
- 「声かけ済み」POST 失敗時も、楽観的 +1 を**サーバ確定できなかったことが分かる**ようにする
  (エラー表示 + カウントをサーバ値へ戻す/再取得)。

## 軽微(ついでに直す・スコープを広げない範囲で)

- `frontend/src/api/schemas/koekakeSchema.ts` の zod 制約を実契約に寄せる:
  `suggested_prompt.level` は 1〜3 の範囲、詳細の候補 `level` も同様。`completion.status` /
  `updateCompletionResponse.status` は `completionStatusSchema`(6値enum)にする。
  ただし**タスクの `status` は `scheduled` も含む**ため広めのままでよい(enum化するなら scheduled も含める)。
- `KoekakePhaseTabs` は既存 `components/ui/SegmentedTabs.tsx` と重複気味。**今回は無理に共通化しない**
  (デスクトップ表示要件で分けた経緯がある)。時間があれば SegmentedTabs 側に表示オプションを足して
  寄せてよいが、リスクを上げるなら現状維持。

## 完了条件(自分で実行して緑にしてから報告)

```
cd frontend
npm run lint
npm run typecheck
npm run test    # 修正1〜4に対応するテストを追加/更新すること
npm run build
```

テスト追加の要点:
- 修正1: 声かけ済み→Undo 後に、推奨文(suggested)がサーバ再取得値へ戻る(level2の残留がない)。
- 修正2: 同一タスクへの cancel/completion/snooze が直列化される(応答逆順でも最終状態がサーバ整合)。
- 修正4: mutation 失敗時にエラー表示が出る/ Undo失敗でトーストが残る。

- 各ゲート結果(件数)を報告に貼る。**コミット・pushはしない**。変更ファイルと対応した指摘番号を報告。
