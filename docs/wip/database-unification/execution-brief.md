# DB統合 4日間 共通実行ブリーフ

作成日: 2026-07-18
更新日: 2026-07-19（DR-027同期）

対象: Cursorによる実装、Codexによるレビュー・品質ゲート

親計画: `docs/wip/database-unification/implementation-plan.md`

## 1. 実装前に読むもの

作業者は着手前に次を読む。

1. `AGENTS.md`
2. `docs/product-plan.md`
3. `docs/development-plan.md`
4. `docs/architecture.md`
5. `docs/design-principles.md`
6. `docs/data-model.md`
7. `docs/api-contract.md`
8. `docs/design-decisions.md` の DR-022〜DR-027
9. `docs/wip/database-unification/implementation-plan.md`
10. 対象Phaseの実装指示書とレビュー依頼書

Claudeのproject memoryに保存されていた運用ルールも本ブリーフへ反映済みである。
古いmemoryと現在の恒久文書が食い違う場合は、最新のユーザー指示、DR、恒久文書の順で判断する。

## 2. 現在の事実

- PR #27 / #28 はマージ済み。
- 夏休み対応の本番 `migrate:fresh` はユーザー操作で実施済み。**二度と再実行しない**。
- 夏休み対応で残る作業は、シード復元確認、`migrate:status`、実際の書き込み確認である。
- 2026-07-19の本番読取スモークで、health、声かけ22件、メンバー、夏休みplan生成は確認できた。
- 同スモークで声かけ `scheduled_at` がJSTの想定より9時間後ろへずれる問題を検出した。
  修正の本番反映と再確認が終わるまで、Gate 0は未完了とする。
- Phase B拡張マイグレーションはPR #31、DR-027の恒久モデルはPR #32でmainへマージ済み。
- これ以降、既存CREATEマイグレーションを書き換えない。
- 本番スキーマ変更は差分ALTER、事前監査、バックフィル、制約追加の順で行う。
- 旧Render APIはロールバック先なので、明示的な削除指示があるまで残す。
- `.claude/settings.local.json` はユーザー環境のローカル設定であり、変更・ステージ・コミットしない。

## 3. 役割分担

- Cursor: 実装、実装中のテスト、最初の完了報告。
- Codex: 独立コードレビュー、仕様適合確認、品質ゲートの再実行、合否判定。
- ユーザー: Laravel Cloud / Renderなど管理画面で必要な本番操作と実機確認。
- 同じ作業ツリーをCursorとCodexが同時に変更しない。Cursor完了後にCodexへ渡す。

レビューで修正が必要な場合は、Codexが指摘を具体化し、Cursorが修正し、Codexが再確認する。
小差分は原則1周、大きなDB移行は重大指摘がなくなるまで確認する。

## 4. Git・PRルール

- 着手前とコミット前に `git status -sb` を実測する。
- 必ず最新 `main` からブランチを切る。他のfeatureブランチへ相乗りしない。
- 1ブランチ = 1デプロイ単位。
- バックエンドとフロントは別ブランチ・別PR。
- コード変更とdocsのみの変更を同じPRへ混ぜない。
- `main` へ直接pushしない。docsもPR経由にする。
- 意味単位でコミット・pushする。PR作成とmainマージはユーザー確認後。
- ユーザーや他エージェントの無関係な変更をステージしない。

## 5. DB安全ルール

- `migrate:fresh`、`db:wipe`、既存データの一括削除は禁止。
- 既存CREATEマイグレーションの変更は禁止。
- 追加 → 監査 → バックフィル → 比較 → 制約 → 読取切替 → 書込切替の順を守る。
- 一意制約の前に重複、NULL、不正status、負数、日時逆転を監査する。
- バックフィルは再実行可能か、少なくとも二重実行で増殖しないようにする。
- 履歴・実績・回答・ポイント・取込データを物理削除しない。
- 訂正は追記、出来事の取消は `activity_event_cancellations`、報酬取消は反対取引で表す。
- 共通イベント、参加者、結果、声かけ固有情報は同一トランザクションで作る。
- `activity_events` に人物役割・結果・予定FK・取消日時のnullable列を増やさない。
- 旧API互換を保ち、新旧集計が一致してから旧読取・旧書込を止める。
- 外部キーの削除動作、CHECK、UNIQUE、部分インデックスを明示する。
- SQLiteだけで部分UNIQUEやCHECKが通ったと判断せず、PostgreSQL 17との差をレビューする。

## 6. 4日間の実行順

1. 夏休み対応の残確認。破壊的操作はしない。
2. Phase B: `routine_templates.slug`、低リスク制約、人物FK。
3. Phase C: `activity_definitions` と既存活動マッピング。
4. Phase D: 共通イベント、人物参加、結果、取消、予定接続の最小縦断接続。
5. Phase E: 娘の見通しのうち活動になる回答を予定へ接続。
6. Phase A: 家族共有トークン。
7. 支援者向けレポートMVP。

DB中核が品質ゲートを通らなければ、追加画面へ進まない。

## 7. 今回のDB統合完了条件

- 同じ活動名・ラベルの正本が `activity_definitions` に集約される。
- 全有効 `task_definitions` / `routine_templates` が活動マスタへ接続される。
- おしごと、声かけ、完了が共通 `activity_events` へ接続される。
- 全イベントに1件以上の `actor` があり、母・娘のタイムラインを参加行から生成できる。
- 必要な娘の見通しが `planned_activities` へ接続される。
- 既存APIと画面が壊れず、移行前後の件数・ポイント・完了状態が一致する。
- 取消・訂正後も元イベント、人物参加、結果、声かけ固有情報が残る。
- マイグレーションのup / 安全な範囲のrollback、冪等再送、並行リクエスト、JST境界を確認する。

## 8. 品質ゲート

バックエンド:

```bash
cd backend
php artisan test
./vendor/bin/pint --test
```

フロントを変更した場合:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

API新機能はPestのfeatureテスト、フロントは既存慣習のVitest + fetchモックで契約を検証する。
本番curlスモークはデプロイ後の設定・コールドスタート確認に限定する。

## 9. 禁止する完了報告

- テストを実行せず「たぶん動く」と報告しない。
- SQLiteだけの結果でPostgreSQL固有制約を保証しない。
- grepを動的な文字列組み立てで回避しない。検索条件の意図を満たす。
- JSONの値がnullであることだけでキー存在を保証しない。契約テストではキー自体を確認する。
- 本番API応答が200であることだけでマイグレーション成功と判断しない。
