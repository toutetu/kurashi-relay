# Gate 2 Backup Runbook

更新日: 2026-07-19

## 目的

管理下 DB refresh の直前に、対象環境の全量 logical backup を取得し、
復元可能であることを確認する。

## 対象

- 本番 PostgreSQL（Laravel Cloud）
- 検証用 PostgreSQL 17
- ローカル検証用 SQLite（`scripts/gate2-local-refresh.ps1` が自動取得）

## 事前確認

1. 対象 DB を接続先・サービス名・環境名で特定する（本番と検証を取り違えない）。
2. 書込停止時間と影響範囲を記録する。
3. 直前リリースのコミット SHA / デプロイ ID を記録する。
4. 家族共有トークン保護が有効であることを確認する。

## 手順（PostgreSQL）

1. `pg_dump` または Laravel Cloud の logical export で **全テーブル** を取得する。
2. backup ファイルを対象 DB とは別の保存先へ置く。
3. テーブル別行数を `SELECT relname, n_live_tup ...` または `COUNT(*)` で記録する。
4. backup ファイルの SHA256 を計算して記録する。
5. 別接続先または一時 DB へ restore し、件数が一致することを確認する（本番 refresh 前のリハーサル）。

## 手順（ローカル SQLite）

`scripts/gate2-local-refresh.ps1` を使う場合、`-DatabasePath` 指定時に
`pre-refresh.sqlite`・`manifest.txt`・`run.log` が evidence ディレクトリへ自動保存される。

## 記録する項目

| 項目 | 例（本番値は書かない） |
|---|---|
| 対象環境名 | `production` / `staging` / `local-gate2` |
| 取得日時 (JST) | `2026-07-19 20:00` |
| backup 保存先 | 別ボリューム / 別バケット |
| SHA256 | 64 文字のハッシュ |
| テーブル別件数 | `family_members=2` など |
| restore 確認結果 | `pass` / `fail` |

## 禁止事項

- 本番 backup ファイルを Git へコミットしない。
- `FAMILY_TOKEN` や接続パスワードを runbook や Gate 記録へ書かない。
- 対象 DB を特定せずに backup を取得しない。

## 関連

- `gate2-refresh-runbook.md`
- `gate2-production-restore-runbook.md`
- `gate2-local-gate-record-template.md`
