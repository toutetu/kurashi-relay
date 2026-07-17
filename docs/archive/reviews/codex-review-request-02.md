# Codexレビュー依頼 02: 修正の再検証

対象: ブランチ `feature/oshigoto-persistence-api` のコミット `f8a008b`(fix)以降。
前回レビュー: `docs/deploy_change/codex-review-report-01.md`
修正スペック: `docs/deploy_change/oshigoto-persistence-fix-spec-02.md`

## 依頼内容

**コード変更禁止・レビュー専任。** 結果を `docs/deploy_change/codex-review-report-02.md` に日本語で書く(新規作成のみ)。テスト実行可。

前回指摘の修正を検証:

1. 重大1(受理キー未保存→取消後再送で復活): `task_record_operations` テーブル方式で解消したか。前回の6手順シナリオを実際に再現して確認。マイグレーション内バックフィルの安全性も確認
2. 中1(pgsql timezone): `config/database.php` の `'timezone' => 'UTC'` で足りるか
3. 中2(QueryException全回復): `isUniqueViolation`(23505/sqlite文字列)の限定は妥当か
4. 中4(非数値DELETE 500・エラー形): `whereNumber` と全エラーへの `errors` 付与で契約準拠になったか
5. 中5(単価遡及変化): `granted_point_value` スナップショットで解消したか
6. 新規リグレッション(競合経路・操作テーブルのFK/ユニーク・レースの穴)の有無

## 前提(ブロッカー扱いにしないこと)

- 重大2(アクセス制御)は**2026-07-17にユーザーが「今は保護なし」と明示判断**。リスク記載はよいが、本番投入可否の判定条件から除外する
- PostgreSQL実機・同時実行テストはPhase 6(Laravel Cloud上)で実施予定のため、ローカル未実施は既知

## レポート形式

前回と同じ(重大/中程度/軽微/テスト実行結果/総合判定)。
