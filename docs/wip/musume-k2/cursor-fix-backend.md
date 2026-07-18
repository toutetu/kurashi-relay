# Cursor修正依頼: K2 バックエンド 振り返り完了APIの冪等性(1点)

Codexレビューで**重大1件**が出ました。以下だけをピンポイントで修正してください。
**スコープ拡大禁止**(他ファイル・他ロジックに触らない)。修正後に品質ゲート3種を再度緑にして報告。

## 直すもの

### 症状(スペック §3 / §4-4 違反)

`POST /api/musume/plan/{id}/reflection/complete` の**再送が「同値」になっていない**。
現状 `backend/app/Services/Musume/MusumePlanService.php` の `completeReflection()` は、
呼ばれるたびに `$now = now('UTC')` を生成し、`started_at` / `completed_at` /
`daily_plans.review_completed_at` を**毎回上書き**している。
→ 再送時に時刻が進むとレスポンスの `completed_at` が変わり、「upsert冪等・再送200同値」に反する。

### 期待する挙動

- **初回完了時のみ** `started_at` / `completed_at` / `review_completed_at` を `now` で設定する。
- **再送時は既存の完了時刻を保持**(上書きしない)。レスポンス(plan全体)が初回と**完全に同一**になること。
- 行数は引き続き1件(1 daily_plan = 1 reflection_session)。冪等キーは `daily_plan_id`。
- `mode` / `note` は再送でも同値が送られる前提。既存行の時刻を壊さない限り、値の反映方法は問わない
  (時刻さえ保持されればよい)。

実装例(参考・そのままでなくてよい):
```php
$session = ReflectionSession::query()->firstOrNew(['daily_plan_id' => $plan->id]);
if (! $session->exists) {
    $session->started_at = $now;
    $session->completed_at = $now;
}
$session->mode = $mode;
$session->note = $note;
$session->save();

if ($plan->review_completed_at === null) {
    $plan->update(['review_completed_at' => $session->completed_at]);
}
```
(トランザクション / `lockForUpdate` の枠組みは現状維持)

## テスト修正(回帰を追加)

`backend/tests/Feature/Api/Musume/MusumePlanTest.php` の
`test_reflection_complete_is_idempotent` を強化する:
- 2回目のPOSTの**直前に `Carbon::setTestNow` で時刻を進める**(例: 20:00 → 20:05)。
- 再送レスポンスの `plan.review.completed_at` が**初回と同じ値**(`2026-07-18T20:00:00+09:00`)
  であることをアサートする。
- 行数が1件のまま・`review_completed_at` が初回値のまま、も確認する。

この回帰テストが**修正前は落ち、修正後は通る**ことを確認すること。

## 完了条件(自分で実行して緑にしてから報告)

```
cd backend
php artisan test        # 全緑(強化した冪等テスト含む)
./vendor/bin/pint --test
```

- テスト件数(pass/assertion)を報告に貼る。コミット・pushはしない。
- 触ったファイルは `MusumePlanService.php` と `MusumePlanTest.php` の2つだけであること。
