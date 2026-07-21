# Cursor実装指示書：おしごと集計の二重計上修正

作成時確認基準：`main` の `5996b3f8c0d4b5afaf4a3079c73c6ba7a317827d`

## 1. 目的

`RewardCalculator::summary()` の `today_done_count` が、1回のおしごと記録を2回として数える不具合を修正する。

現在、通常のおしごと記録では同じ1回の操作について次の2行が作られる。

- `task_records` の1行
- `activity_events` の1行（`source = oshigoto`）

ところが現在の `RewardCalculator` は、当日の有効な `task_records` 件数と当日の有効な `activity_events` 件数をそのまま加算している。そのため、通常の新規記録1回に対して `today_done_count = 2` となる。

今回直すのはこの集計だけとする。DB統合や旧テーブル削除には進まない。

## 2. 作業開始時のルール

1. 最初に `git status -sb` を実測する。
2. 既存の未コミット差分があれば保持し、取り消さない。
3. 最新の `main` を前提に作業する。新しい作業ブランチが必要な場合は `fix/reward-summary-double-count` とする。
4. この指示書を実装計画として扱い、別の計画書・レビュー依頼書・WIP文書は作らない。
5. commit・push・PR作成は、別途指示がない限り行わない。

## 3. 変更対象

主対象：

- `backend/app/Services/RewardCalculator.php`

確認用の最小変更：

- `backend/tests/Feature/Api/OshigotoPersistenceTest.php`

原則として、この2ファイル以外は変更しない。

## 4. 必須の集計仕様

`today_done_count` は、次の「重複を除いた和」とする。

1. 指定日・指定人物の、取消されていない `activity_events`（`event_type = activity`）
2. 指定日の取消されていない `task_records` のうち、1に対応する `activity_event` が存在しない旧・孤立レコード

式で表すと次のとおり。

```text
today_done_count
= 当日の有効な activity_events 件数
+ 対応する有効な activity_event がない当日の有効な task_records 件数
```

### 対応関係の判定

`task_records.idempotency_key` に対応するイベントキーは、既存の次のメソッドで求める。

```php
TaskRecordService::activityEventIdempotencyKey($record->idempotency_key)
```

文字列 `oshigoto:` を別の場所へ直書きせず、既存メソッドを使う。

### 実装上の注意

- `ActivityEventRecordQuery::activityEventsForActorOnDate()` が返すコレクションを1回取得し、件数と冪等キー集合の両方に使う。
- `TaskRecord` は現在と同じく、`family_member_id`、`record_date`、`cancelled_at IS NULL` で抽出する。
- 当日のイベントの `idempotency_key` 集合を作り、対応キーが集合にない `TaskRecord` だけを旧データの補完分として数える。
- `activity_events` だけに単純一本化しない。過去の未連携 `task_records` を集計から消さないためである。
- `task_records + activity_events - task_records全件` のような単純減算にはしない。声かけ完了など、`task_records`を持たない独立した `activity_events` も1件として数える必要がある。
- 取消済みの `task_records` と `activity_events` はどちらも数えない。
- 日付の解釈、タイムゾーン処理、過去日記録の扱いは今回変更しない。

可能であれば、`summary()` 内を読みやすくするため、今回の計算だけを次のようなprivateメソッドへ分ける。

```php
private function todayDoneCount(FamilyMember $member, string $date): int
```

ただし、この修正のために別クラスの大規模リファクタリングはしない。

## 5. 変更してはいけないもの

- `lifetime_count`
- `gauge_count`
- `full_count`
- `coins`
- `points`
- `collections_count`
- ごほうび獲得条件
- `task_records` と `activity_events` の現在の二重書き込み
- DBマイグレーション、テーブル、外部キー
- APIのパス、リクエスト、レスポンス形式
- React側の楽観更新処理
- 声かけ・予定・カレンダー・レポート機能
- ドキュメント類

今回の目的は、`today_done_count` の重複排除だけである。

## 6. 最小回帰確認

新しいテストファイルや大きなテストケースは作らない。

既存の次のテストメソッドへ、最小限のアサーションを追加する。

```text
OshigotoPersistenceTest::test_post_creates_record_and_updates_summary
```

子どもの1回目の記録結果と、母の1回目の記録結果の両方に次を追加する。

```php
->assertJsonPath('data.summary.today_done_count', 1)
```

これにより、内部では `task_records` と `activity_events` が各1行作られても、利用者向け集計は1件になることを確認する。

実行する確認はこの1件だけとする。

```powershell
cd backend
php artisan test --filter=test_post_creates_record_and_updates_summary
```

全件テスト、全ビルド、Pint、typecheck、フロントエンドテストは実行しない。

確認に失敗した場合は、今回の変更箇所だけ直して同じコマンドを再実行する。確認範囲を広げない。

## 7. 完了条件

- おしごとを1回記録したレスポンスの `today_done_count` が `1`
- 同じ人物・同じ日に2回記録すれば、論理上 `2` と数えられる構造になっている
- `task_records`にしか存在しない旧記録も1件として残る
- `task_records`を持たない単独の`activity_events`も1件として数えられる
- 取消済み記録は数えない
- `lifetime_count`、ゲージ、コイン、ポイント、ごほうび処理は変更されていない
- 指定したテスト1件が成功している

## 8. 完了報告

作業後は次だけを簡潔に報告する。

1. 変更したファイル
2. 二重計上をどのように除外したか
3. 実行した1件の確認コマンドと結果
4. 今回触っていない範囲

追加改善や旧テーブル削除は提案だけに留め、このセッションでは実装しない。
