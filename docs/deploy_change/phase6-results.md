# Phase 6: Laravel Cloud API 本番試験 結果

実施日: 2026-07-17
対象: `https://kurashi-relay-production-olnfy0.laravel.cloud`(実PostgreSQL 17.10 / Singapore)
実施者: Fable(curlで実機検証)

## 結果サマリ: 全項目合格 ✅

| # | 試験 | 期待 | 実測 | 判定 |
|---|---|---|---|---|
| 1 | GET /api/tasks (child) | 200・5タスク | 200・5タスク done:false | ✅ |
| 2 | GET /api/rewards/summary | 200・count 0 | 200・lifetime 0 | ✅ |
| 3 | POST /api/task-records 初回 | 201・count 1 | 201・deduplicated:false・lifetime 1 | ✅ |
| 4 | 同一キー再送 | 200・二重加算なし | 200・deduplicated:true・**lifetime 1のまま**・同id | ✅ |
| 5 | 別キー・同一task/date(業務重複) | 既存を返す・新規作成なし | 200・dedup:true・同id=1・count 1 | ✅ |
| 6 | DELETE(取消) | 200・count 0 | 200・cancelled_at設定・lifetime 0 | ✅ |
| 7 | 取消後の集計 | count 0 | lifetime 0 | ✅ |
| 8 | **【重大1】取消後に古いキー再送** | 復活しない・count 0 | 200・取消済みレコードを返すのみ・**新規作成なし・count 0** | ✅ |
| 9 | 再送後の集計 | count 0維持 | lifetime 0 | ✅ |
| 10 | 不正な日付(2026-13-99) | 422 | 422・errors.date(形式+未来日) | ✅ |
| 11 | 存在しないタスク | 422 | 422・errors.task「見つかりません」 | ✅ |
| 12 | 母POST(ポイント経路) | points反映 | 201・**points=10(単価スナップショット)** | ✅ |
| 13 | 母 summary | points=10 | points=10 | ✅ |
| 14 | 母 tasks list | done:true+record_id | done:true・record_id:2 | ✅ |

- JST表示: `completed_at` が全て `+09:00` オフセット付き(例 `2026-07-17T01:26:02+09:00`)で正常。
- 永続化: 各リクエスト間で記録が保持され、summary再取得で一貫。
- **重大1(取消後の再送で完了が復活)の修正が実PostgreSQLで確定的に動作することを確認**(Codex report-02 の懸念解消)。

## テストデータの後始末

試験で作成した task_records(id=1 child/kigae, id=2 mother/shokki)は**両方とも取消済み**にした。
現在の表示状態: 両メンバーとも全タスク done:false・lifetime 0(クリーン)。
- 取消済みレコードと operations 行はDBに残るが、done表示・集計に影響しない(害なし)。
- 完全にまっさらにしたい場合のみ、Commandsで下記を実行(**migrate:fresh は本番禁止のため使わない**):
  ```
  php artisan tinker --execute="DB::table('reward_collections')->delete(); DB::table('reward_adjustments')->delete(); DB::table('task_record_operations')->delete(); DB::table('task_records')->delete();"
  ```
  (FK順: 子テーブルから削除。family_members と task_definitions は残す)

## 未実施(Phase 8で確認)

- DB Scale to Zero(300秒休止)からの復帰後の初回POST: 連続アクセスで温めていたため未計測。Phase 8の安定確認で実施。
- 10回達成の節目報酬(ゾンビ/お菓子)の実機発火: 子タスクは5種のため10到達に複数日必要。ユニットテスト36件+Codexで検証済みのため実機は後日。

## デプロイ運用メモ(重要・再発防止)

- **Laravel Cloudは自動でマイグレーションを実行しない**。デプロイ後にCommandsで `php artisan migrate --force` を手動実行する(または Deploy設定にコマンド追加を検討)。
- **`php artisan db:seed` は本番で `--force` 必須**(なしだと確認プロンプトで自動キャンセル)。
- `composer.json` に `Database\\Seeders\\` / `Database\\Factories\\` の psr-4 が必要(欠けると本番でDatabaseSeeder未検出。2026-07-17に修復済み・PR merged)。
