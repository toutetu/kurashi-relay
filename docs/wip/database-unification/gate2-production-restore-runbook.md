# Gate 2 Production Restore Runbook

更新日: 2026-07-19

## 目的

本番 refresh 失敗時に、refresh 前の logical backup から DB を復元する。

## 発動条件

次のいずれかで発動する（`implementation-plan.md` 8.1.3 参照）。

- migration / seed 失敗
- 必須制約・FK・index 不足
- アプリ起動不能
- 最小スモーク失敗

## 前提

- refresh 前に全量 backup、テーブル別件数、SHA256、restore 手順が記録済みである。
- 直前の正常コード版が再デプロイ可能である。
- 破壊的 migration の `down()` には依存しない。

## 手順

1. **書込停止を維持**する。利用者へ影響を通知済みであること。
2. **直前コードを再配信**する（Laravel Cloud のロールバック / 前リリース再デプロイ）。
3. 対象 PostgreSQL へ **refresh 前 backup を restore** する。
4. `php artisan migrate:status` で migration 状態を確認する。
5. テーブル別件数が backup 記録と一致することを確認する。
6. `/api/health` と `gate2:smoke` 相当の最小スモーク（health / dashboard read / task-record write / replay / cancel）を実行する。
7. 結果を Gate 記録へ追記する。Inertia 開始は行わない。

## restore コマンド例（PostgreSQL）

環境ごとの接続情報は **Gate 記録の別欄** にのみ保持し、本 runbook には書かない。

```bash
# 例: 空の対象 DB へ論理リストア
psql "$RESTORE_DATABASE_URL" < /path/to/pre-refresh.dump
```

## 確認チェックリスト

- [ ] backup SHA256 が記録と一致
- [ ] 主要テーブル件数が refresh 前記録と一致
- [ ] `/api/health` が 200
- [ ] 家族共有トークン保護 API（dashboard read / task-record write）が期待どおり動作
- [ ] 旧 Render API がロールバック先として到達可能（必要時）

## 禁止事項

- 本番接続文字列・トークンを Git / docs へ記載しない。
- backup なしで `migrate:fresh` を再実行しない。
- restore 未確認のまま書込再開しない。

## 関連

- `gate2-backup-runbook.md`
- `gate2-rollback-runbook.md`
- `gate2-local-gate-record-template.md`
