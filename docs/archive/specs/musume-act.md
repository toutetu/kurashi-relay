# くらしリレー：声かけ完了処理の簡素化・実績イベント接続依頼

## 対象

* リポジトリ：`toutetu/kurashi-relay`
* 対象ブランチ：最新の `main`
* 対象機能：母の声かけ画面
* 代表ケース：起床の詳細画面で「完了」を押す操作

最初に以下を確認してください。

* `AGENTS.md`
* `docs/data-model.md`
* `docs/design-decisions.md`
* 現在のマイグレーション
* 声かけ詳細画面
* `CompletionService`
* `PromptEventService`

実装前に、変更予定ファイルと簡潔な実装方針を日本語で示してください。

---

# 1. 今回の設計変更

娘の活動について、次のような状態管理は不要と判断しました。

* completed
* partial
* deferred
* unknown

実際に活動が起きた場合だけ `activity_events` を作成し、イベントが存在すること自体を実績とします。

そのため、`activity_event_outcomes` は完全に削除する方針です。

削除対象を確認してください。

* `activity_event_outcomes` テーブル
* `ActivityEventOutcome` モデル
* Eloquentリレーション
* Seeder、Factory
* outcomesを前提とするService
* outcomesを前提とするテスト
* outcomesを前提とする設計書・実装計画の記述

実DBにデータが存在する可能性を確認してください。

* データがない場合は、安全な方法でスキーマから削除
* データがある場合は、先に件数確認とバックアップを行う
* 本番DBを確認せず、破壊的操作を自動実行しない

---

# 2. `activity_events` の意味

`event_type = activity` のイベントは、

> 実際にその活動が起きた

という事実を表します。

完了状態を別テーブルへ保存しないでください。

例：

```text
起床イベントが存在する
＝娘が起床した
```

```text
宿題イベントが存在する
＝娘が宿題をした
```

「未完了」「不明」という実績イベントは作りません。

先送りは、必要に応じて次で扱います。

* `reminder_schedules`
* `planned_activities.status`
* 予定時刻の変更

---

# 3. 起床の完了操作

母が起床の詳細画面で「完了」を押した場合、次の実績イベントを作成してください。

## `activity_events`

```text
activity_definition_id = ACT-037「起床」のID
event_type              = activity
occurred_at             = 実際の起床時刻
ended_at                = NULL
recorded_by_member_id   = 母のID
source                  = koekake
```

現在の画面で実際の起床時刻を入力しない場合は、当面、完了ボタンを押した時刻を `occurred_at` として構いません。

ただし将来、実際の時刻を修正・指定できる構造にしてください。

## `activity_event_participants`

```text
娘 = actor
```

母がボタンを押したことを理由に、母を `actor` にしないでください。

* `recorded_by_member_id`：アプリへ入力した人物
* `actor`：実際に活動した人物

として分離してください。

母が実際に支援した操作を別途記録する場合だけ、

```text
母 = supporter
```

を追加できる構造にしてください。

---

# 4. 声かけと起床は別イベント

母が声をかけた記録と、娘が起床した記録は別々に保存してください。

## 声かけ時

```text
activity_events.event_type = prompt
母 = actor
娘 = target
```

声かけ固有情報は `prompt_events` に保存します。

## 起床時

```text
activity_events.event_type = activity
娘 = actor
recorded_by = 母
```

起床イベントには `activity_event_outcomes` を作成しません。

---

# 5. 予定と実績の対応

対象の `daily_tasks.planned_activity_id` が存在する場合、起床予定と起床実績を `plan_actual_links` で結んでください。

```text
planned_activity_id = 対応する起床予定
activity_event_id   = 作成した起床イベント
link_type           = primary
matched_by          = automatic
confidence          = 100
```

予定と実績を基本的に対になる構成とします。

```text
planned_activities
  planned_start_at
  planned_end_at

activity_events
  occurred_at
  ended_at
```

`activity_events` に `ended_at` がまだ存在しない場合は、nullableで追加してください。

DB制約：

```sql
ended_at IS NULL OR ended_at >= occurred_at
```

起床や声かけなど、瞬間の出来事では `ended_at = NULL` とします。

---

# 6. 冪等性

フロントから再送のたびに新しいUUIDを送る方式は採用しないでください。

新しいUUIDを毎回送ると、同じ完了操作の通信再送を別操作として登録してしまいます。

## 通常のInertia画面

クライアントUUIDへ依存せず、サーバー側で業務キーによる冪等性を保証してください。

候補となる業務キー：

```text
daily_task_id
planned_activity_id
操作種別
```

完了処理では、同一トランザクション内で次を行ってください。

1. 対象の `daily_task` または `planned_activity` をロック
2. すでに有効なprimary実績があるか確認
3. 存在する場合は既存イベントを返す
4. 存在しない場合だけ新しいイベントを作る
5. DBの一意制約でも二重作成を防止する

同じ完了リクエストを2回送っても、起床イベントは1件だけにしてください。

## オフライン再送API

オフラインキューなどでoperation IDが必要な場合は、

* 最初のユーザー操作時に1回だけ生成
* 端末側のキューへ保存
* 成功するまで同じIDで再送
* 再送時に新しいUUIDを生成しない

という方式にしてください。

既存の `activity_events.idempotency_key` を残す場合も、サーバーまたは永続化された操作キューから安定した値を設定してください。

---

# 7. 旧互換テーブル

移行期間中に必要なら、次の既存処理は維持して構いません。

* `completion_events`
* `daily_tasks.status`
* `reminder_schedules` の取消

ただし、新しい実績の正本は `activity_events` とします。

旧テーブルと新テーブルへ二重書き込みする場合は、同じDBトランザクションで実行し、片方だけ保存されないようにしてください。

新しい書き込み経路が安定した後、次を別作業として検討してください。

* `completion_events` の廃止
* `daily_tasks.status` の非正本化
* 旧完了ステータスの削除

今回、これらの旧テーブルを同時に削除する必要はありません。

---

# 8. 既存ステータスの扱い

現在の以下の状態を、新しい活動実績へそのまま持ち込まないでください。

```text
partial
deferred
unknown
```

`deferred` は必要なら再通知・予定変更として扱い、活動実績は作りません。

`partial` を今後本当に記録したくなった場合は、今回の実装へ混ぜず、別要件として検討します。

`completed` は状態行を作るのではなく、活動イベントを作成します。

`一緒にした` や `母がした` を画面に残す場合は、outcomeではなく参加者で表してください。

```text
一緒にした：
娘 = actor
母 = supporter

母が代行した：
母 = actor
娘 = target
```

ただし起床は本人しかできないため、「母が代行した」を選択できないようにしてください。

---

# 9. 受け入れ条件

母が起床詳細画面で「完了」を押した場合、以下を満たしてください。

* 起床の `activity_events` が1件作成される
* `event_type = activity`
* `recorded_by_member_id = 母`
* `source = koekake`
* 娘が `actor` として保存される
* `activity_event_outcomes` は存在せず、結果行も作られない
* 対応する予定があれば `plan_actual_links` が作成される
* 同じリクエストを再送しても実績イベントが増えない
* 声かけイベントと起床イベントは別々に残る
* 旧互換更新を残す場合は、全処理が同一トランザクションで行われる

---

# 10. 最小限の確認

大規模な全テストは実行しないでください。

次の代表確認だけで構いません。

1. 起床の完了で娘の活動イベントが1件作られる
2. 同じ完了操作を2回送っても1件のまま
3. 声かけイベントと起床イベントが別々に保存される
4. 予定がある場合にprimaryリンクが作られる
5. 予定がない場合でも完了処理が成功する
6. `ended_at < occurred_at` が拒否される

画面操作1回、または対象APIの代表的な確認を行ってください。

---

# 11. 完了報告

実装後、日本語で次を報告してください。

* 削除したテーブル・モデル・関連コード
* 完了ボタン押下時の新しい保存フロー
* 実際に作成・更新されるテーブル
* 冪等性を保証した方法
* UUIDを使う場合の生成・再送方法
* 実行した最小限の確認
* 旧互換テーブルとして残したもの
* 今後削除できる旧テーブル
* 本番DBやマイグレーション上の注意点

コミットメッセージとPR本文は日本語にしてください。

## InertiaとAPIの役割

この声かけ画面はLaravelのInertiaルートから表示されていますが、現在の `KoekakePage` はTanStack Queryを使用し、声かけ・完了・取消・再通知を内部JSON APIへ送信しています。

今回の修正では、完了処理をInertia標準フォームへ移行しないでください。

以下のAPIを、同一オリジンの内部APIとして維持してください。

```text
PATCH /api/koekake/tasks/{id}/completion
POST  /api/koekake/prompt-events
DELETE /api/koekake/prompt-events/{id}
POST  /api/koekake/tasks/{id}/snooze
```

Inertiaの役割は以下です。

* `/koekake` ページの表示
* Laravel側のルーティング
* 共通レイアウト
* ページ間遷移
* 将来のセッション認証

内部APIの役割は以下です。

* 声かけの記録
* 起床などの活動実績の記録
* 取消
* 再通知
* 高速な画面内更新
* 将来のオフライン再送
* 冪等性の保証

業務ロジックはControllerへ直接書かず、既存のService層に置いてください。

## 完了APIの冪等性

完了操作の再送ごとに、フロントから新しいUUIDを生成する方式は採用しないでください。

通常の完了操作では、サーバー側で安定した業務キーを生成してください。

例：

```text
koekake:daily-task:{daily_task_id}:completion
```

同じ日次タスクに対する同じ完了操作では、常に同じキーを使用します。

処理は同一DBトランザクション内で次の順序にしてください。

1. 対象の `daily_tasks` を `lockForUpdate()` で取得する
2. 対応する有効な活動実績がすでに存在するか確認する
3. 存在する場合は新規作成せず既存イベントを返す
4. 存在しない場合だけ `activity_events` を作成する
5. 娘を `activity_event_participants.role = actor` として登録する
6. 対応予定がある場合だけ `plan_actual_links` を作成する
7. 旧互換更新を残す場合は、同じトランザクション内で行う

DBの一意制約でも二重作成を防止してください。

オフラインキューを将来実装する場合だけ、最初のユーザー操作時にoperation IDを一度生成して端末へ永続保存し、成功するまで同じIDで再送してください。再送時に新しいUUIDを作らないでください。
