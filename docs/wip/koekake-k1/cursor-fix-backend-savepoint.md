# Cursor修正依頼: PromptEventService の冪等INSERTをセーブポイントで囲む(本番PostgreSQL 500バグ)

Codexレビューで検出された**重大バグ1件のみ**を修正してください。他は変更しないこと。

## 問題

`backend/app/Services/Koekake/PromptEventService.php` の `store()` で、prompt_events の INSERT
(`PromptEvent::query()->create([...])`)が**外側トランザクション内で直接**実行されている。
PostgreSQL では unique 違反(同一 `idempotency_key` の並行再送)が起きると外側トランザクションが
**abort 状態**になり、その後 catch 節で行う `PromptEvent::query()->where('idempotency_key', ...)->first()`
(SELECT)も失敗する → **本番で 500**。ローカルの SQLite はこの abort 挙動が無いため既存テストでは緑になる。

## 正しいパターン(既存コードに実在・これに合わせる)

`backend/app/Services/TaskRecordService.php` の `store()`(64行目付近)と `recoverFromInsertConflict()`
(214行目付近)、`isUniqueViolation()`(305行目付近)を参照。ポイント:

- INSERT を **ネストした `DB::transaction(function () { ... }, 1)`(第2引数1回=セーブポイント)** で囲む。
- catch では `QueryException` が **unique 違反(SQLState `23505` または "UNIQUE constraint failed")か
  どうかを判定**し、そうでなければ **rethrow**(現状は全 QueryException を回復扱いにしていて広すぎる)。
- unique 違反のときだけ、外側トランザクション(セーブポイントで生存)で勝者行を SELECT して 200 を返す。

## 修正内容(PromptEventService.php の store() だけ)

1. `try { ... } catch (QueryException $exception) { ... }` のうち、
   `PromptEvent::query()->create([...])` の**INSERT部分をネストした `DB::transaction(fn () => ..., 1)`
   で囲む**。`lockForUpdate()->findOrFail($dailyTaskId)` と `$activeCount` の算出、
   `recalculatePromptCache($task)` はセーブポイントの外(外側トランザクション内)のままでよい
   —— セーブポイントで囲むのは**重複しうる INSERT のみ**。
2. catch 節の先頭で `isUniqueViolation($exception)` を判定し、false なら rethrow。
   判定ヘルパは TaskRecordService と同じ実装を PromptEventService に private で持たせる
   (SQLState 23505 / "UNIQUE constraint failed")。
3. 既存の「recovered が payload と不一致なら IdempotencyConflictException」ロジックはそのまま維持。

`completion` / `snooze` / `cancel` など他メソッド・他サービスは**触らない**。

## テスト追加(`backend/tests/Feature/Api/Koekake/PromptEventTest.php`)

SQLite では PostgreSQL の abort は再現できないが、**回復経路(catch → 勝者SELECT → 200)自体は
検証できる**ようにする:

- 既存の逐次再送テストは残す。
- 追加: 同一 `idempotency_key` で `PromptEvent` を**事前に直接 insert** しておき、その後 `store()` を
  同じキーで呼ぶと、`QueryException`(unique違反)経路を通って **200・同一 prompt_event_id・行が増えない**
  ことを検証(early-return の `$existing` 経路ではなく catch 経路を通すため、`store()` 内の
  最初の existing チェックをすり抜けるように、insert は同一トランザクション外で行う等の工夫が要る場合は
  テスト内でコメントを残す)。
- 非 unique の QueryException が rethrow されることは、無理なら省略可(コメントで理由を残す)。

## 完了条件(自分で実行して緑にしてから報告)

```
cd backend
php artisan test
./vendor/bin/pint --test
```

- 結果(件数)を報告に貼る。**コミット・pushはしない**。変更したファイルと、加えた変更点の要約を報告する。
