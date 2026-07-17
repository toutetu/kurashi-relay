# Codexレビュー報告 02

レビュー対象: ブランチ `feature/oshigoto-persistence-api`、`f8a008b` 以降 (`HEAD: 4e73812`)

結論: **前回の重大1（受理キー未保存による取消後の復活）は解消した。重大な未解決指摘はない。** 6手順シナリオでは、キーBの再送が `200 / deduplicated=true` で取消済みの同一レコードを返し、新規レコードを作らないことを確認した。pgsqlのUTC固定、unique違反だけへの回復限定、非数値DELETEと共通エラー形、今後作成するレコードのポイント単価スナップショットも意図どおりである。

一方、別キー重複の初回応答と再送応答で `revealed_reward` が変わる新規リグレッションと、既存レコードに対するポイント単価のバックフィル欠落を確認した。Phase 5の作業開始は妨げないが、Renderフロントの本番切替前に修正・再確認することを推奨する。

## 重大(本番前に必ず修正)

なし。

### 前回重大1の解消確認

対象: `backend/app/Services/TaskRecordService.php:39-61,72-91,94-133,244-340`、`backend/database/migrations/2026_07_17_000001_create_task_record_operations_table.php:12-34`

- 新規201、業務重複200の両方で `task_record_operations` が作成され、以後はoperationを先に照合する。
- operationが指すレコードが取消済みでも、その現在状態を返し、新規完了を作らない。
- 前回の6手順を実装したFeature Testを単独実行し、`1 test / 14 assertions` で成功した。最終状態は `task_records=1`、`operations=2`、有効レコード0。
- 修正前5マイグレーションだけを適用した一時SQLite DBへ既存レコード2件を置き、operationsマイグレーションを後から適用した。2件ともキー、member、task、日付、record IDが正しくバックフィルされた。
- 元の `task_records.idempotency_key` はuniqueであり、バックフィルは全レコードをID順に処理する。PostgreSQLではLaravelが当該migrationをトランザクションで包むため、途中失敗時にテーブルだけが残る形にもならない。取消済みレコードを除外する条件もなく、静的にも妥当である。

## 中程度(修正推奨)

### 1. 別キー重複の初回応答と同じキーの再送応答で `revealed_reward` が変わる

対象: `backend/app/Services/TaskRecordService.php:55-60,91,271-276,334-339`

節目報酬を付与したレコードへ別キーBが業務重複として受理された場合、初回Bは `buildStoreResult` へ報酬を渡さないため `revealed_reward=null` になる。一方、Bの再送はoperationからcanonical recordを読み、そのrecordに紐づく報酬を渡すため、同じBなのに報酬ありへ変わる。

手動再現結果:

```text
キーAで10件目を作成: revealed_reward=prisoner
別キーBの初回重複: revealed_reward=null
同じキーBの再送: revealed_reward=prisoner
task_records=10 / operations=11
```

DBの二重付与は起きないが、Phase 4の「同一キーの再送は同じ結果を返す」に反し、応答喪失後の再送で古い節目報酬のお祝い演出を誤って出す可能性がある。operationが元レコードの作成キーかを判定して報酬を返す、またはoperationごとの返却結果を保存するなど、初回と再送を一致させること。別キー重複が節目レコードを指すケースの回帰テストも必要。

### 2. `granted_point_value` 追加時に既存の母レコードが0ポイントへ変わる

対象: `backend/database/migrations/2026_07_17_000002_add_granted_point_value_to_task_records_table.php:10-13`、`backend/app/Services/RewardCalculator.php:45-53`

追加列はdefault 0だが、既存 `task_records` を当時の `task_definitions.point_value` で埋める処理がない。マイグレーション直後から集計元が新列へ切り替わるため、既存の母レコードはすべて0ポイントとして扱われる。

修正前スキーマへ10ポイントの母レコードを1件置いてから新マイグレーションを適用した手動結果は、`granted_point_value=0 / summary.points=0` だった。修正スペック記載どおり本番未適用で、対象DBにレコードが一件もなければ現時点の実害はない。しかし、既存データがある環境へ適用できるmigrationとしては安全ではなく、単価の履歴再現性を直す変更自身が移行時の履歴を失わせる。

既存行をtask definitionの現単価で一度だけバックフィルしてから新規記録をスナップショット運用へ移すこと。すでに当該migrationを適用した環境がある場合は、追補migrationにすること。旧スキーマに既存レコードを置いてupgradeする自動テストも追加したい。

## 軽微・提案

- pgsqlの `'timezone' => 'UTC'` はLaravel 12の `PostgresConnector` が接続直後に `set time zone 'UTC'` を発行する設定であり、コード上は十分。実PostgreSQLでの `SHOW TIME ZONE`、UTC保存値、JST境界往復は予定どおりPhase 6で確認する。
- `isUniqueViolation` はPostgreSQL SQLSTATE `23505` またはSQLite標準メッセージ `UNIQUE constraint failed` だけをtrueにし、その他を再throwする。catch対象のINSERTに存在するunique制約とも整合しており、前回の「全QueryException回復」は解消している。想定外QueryExceptionを再throwする自動テストはまだないため追加すると安全。
- `whereNumber('id')` と汎用rendererにより、非数値DELETEは404 JSON、405/500を含む汎用APIエラーはすべて `status/message/errors` 形になった。テストではJSON上の `{}` まで確認されている。
- 同一memberのPOST/DELETEはmember行ロックで直列化され、operation keyとactive recordはDB unique制約でも保護される。異なるmember間の同一キー競合も回復コード上は409へ解決する。実PostgreSQL二接続での待機・savepoint・勝者取得はPhase 6の確認事項として残る。
- 前回重大2のアクセス制御は、2026-07-17のユーザー判断どおり今回の投入可否条件から除外した。公開更新APIであるリスク自体は残る。
- 操作者・確認者・household境界の未設計など、前回の将来拡張上の指摘は今回の修正対象外であり継続課題。

## テスト実行結果

- `cd backend && php artisan test`: **成功** — 34 tests / 238 assertions。
- `cd backend && php vendor/bin/pint --test`: **成功**。
- 6手順シナリオの単独実行: **成功** — 1 test / 14 assertions。取消後のキーB再送は200、同じ取消済みrecord ID、新規行なし。
- operationsバックフィル手動試験: **成功** — 修正前DBの2 recordsから2 operationsを正しい参照で作成。
- 節目レコードへの別キー重複→同じ別キー再送: **不一致を再現** — 初回は報酬なし、再送は報酬あり。中程度1。
- 既存母レコードへポイント列migration適用: **履歴低下を再現** — 10ポイント相当が0。中程度2。
- `git diff --check f8a008b^..HEAD`: **成功**。
- PostgreSQL実機・同時実行: **未実行**。ローカルに `pdo_pgsql` / `psql` がなく、依頼書どおりPhase 6送り。ローカル未実施自体はブロッカー扱いしていない。
- frontendのlint/test/build: **未実行**。対象差分はbackendと文書のみで、今回の再レビュー範囲外。

## 総合判定(本番投入可否)

**重大1は解消。Phase 5へ進行可。ただし現状のままRenderフロントの本番接続先へ切り替えることは推奨しない。**

本番切替前の条件:

1. 別キー重複の初回と同じキー再送で `revealed_reward` を一致させ、回帰テストを追加する。
2. 既存レコードがあり得るDB向けに `granted_point_value` をバックフィルする。完全な新規DBだけへ適用する判断なら、migration直前に `task_records=0` を確認・記録する。
3. 計画済みのPhase 6で、実PostgreSQLのtimezone、同時競合、savepoint回復、部分unique index、JST境界、Scale to Zero復帰を確認する。

アクセス制御の見送りはユーザー決定としてこの判定条件へ含めていない。
