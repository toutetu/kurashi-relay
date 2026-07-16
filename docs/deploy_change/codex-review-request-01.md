# Codexレビュー依頼 01: おしごと永続化バックエンド(本番切替前レビュー)

レビュー対象: ブランチ `feature/oshigoto-persistence-api` の `main` との差分(`git diff main...HEAD`)。
仕様書: `docs/deploy_change/oshigoto-persistence-backend-spec.md`
親指示書: `docs/deploy_change/kurashi-relay_laravel-cloud_deployment_instructions.md`(§6.3が本レビューの観点)

## 依頼内容

**コードは一切変更しないこと。レビュー専任。** 結果は `docs/deploy_change/codex-review-report-01.md` に日本語で書き出すこと(このファイル新規作成のみ許可)。テスト実行(`cd backend && php artisan test`)は行ってよい。

## 必須確認項目(指示書§6.3より)

1. 同じ操作を再送した際に二重加算されないか(idempotency_key・部分ユニークインデックス・savepointリカバリの正しさ。特に `backend/app/Services/TaskRecordService.php`)
2. 完了取消でポイント・ゲージ・コレクションが不整合にならないか(取消→再完了→節目再通過の扱い含む)
3. API失敗後の再送で二重登録されないか(同時POST競合時のQueryException処理がpgsqlで本当に安全か。sqliteテストでは検出できない差がないか)
4. 日付境界を日本時間で正しく扱えるか(`backend/app/Support/JstDate.php`、record_date=JST/保存時刻=UTCの区別、whereDateの挙動)
5. PostgreSQLで問題なく動作する型・構文になっているか(timestampTz、部分unique index、`DROP INDEX IF EXISTS`のpgsql/sqlite両対応)
6. 本番マイグレーションを再実行しても安全か(`php artisan migrate --force` 再実行・シーダー再実行の冪等性)
7. Laravel CloudのScale to Zero(休止復帰)後にエラーにならない設計か(コネクション・トランザクション前提)
8. 子どもの操作と母の確認操作を将来区別できるか / 将来の複数ユーザー対応を妨げないか
9. ポイント残高と実績の不整合を検知できるか(履歴導出方式の妥当性)
10. エラーレスポンスが既存契約(`docs/api-contract-01.md`)の形に一致するか。エラー時に部分更新が残らないか
11. テスト不足の指摘(特に境界・競合・失敗時挙動)
12. 過度なベンダーロックインの有無(将来AWS移行を見据えて)

## レポート形式

```markdown
# Codexレビュー報告 01
## 重大(本番前に必ず修正)
## 中程度(修正推奨)
## 軽微・提案
## テスト実行結果
## 総合判定(本番投入可否)
```
