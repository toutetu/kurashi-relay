# DB統合・履歴化・Google Calendar対応 実装計画

作成日: 2026-07-18
更新日: 2026-07-19（DR-027同期）
対象: バックエンドDB/APIを中心とした段階移行
恒久モデル: `docs/data-model.md`

## 1. 目的

次の3系統を、既存データを失わずに共通の活動軸へ接続する。

1. おしごと・ポイント・ごほうび
2. 声かけ・日次タスク・リマインダー
3. 娘の見通し・予定・振り返り

その上で、母・娘それぞれのタイムラインを同じ出来事から組み立て、Google Calendarから
取り込んだ予定と実際の出来事を突き合わせられる構造にする。

## 2. 今回の確定方針

- 我が家専用の単一家庭システムを維持し、`households` / `household_id` は追加しない。
- 人物軸は既存 `family_members` を使う。
- `routine_templates` は表示名から独立した `slug` を安定キーとして追加する。
- APIは家族共有トークンで保護する。本格的な複数ユーザー認証は導入しない。
- 活動の意味は `activity_definitions` に統合する。
- 予定は `planned_activities`、生活上の出来事は `activity_events` を正本とする。
- 人物の関わり方は `activity_event_participants` の `actor | supporter | target` で表す。
- 活動結果、声かけ固有情報、取消、予定との対応は、該当するときだけ従属行を作る。
- 声かけの日時・入力者・人物参加・冪等キーは共通イベントを正本とし、`prompt_events` は
  回数・文面・レベルだけを1対1で保持する。
- ポイントは `reward_transactions` の台帳から導出する。
- 訂正・取消・回答変更・Calendar更新は履歴を消さず追記する。
- 本番DBで `migrate:fresh` は行わない。すべて差分マイグレーションとバックフィルで進める。
- 既存APIの応答形と1タップ操作は維持し、人物役割を利用者へ毎回選ばせない。

## 3. 認証なしは重要か

**重要。単一家庭かどうかとは別問題である。**

現在のAPIは公開URLへ直接リクエストでき、CORSはcurlや別サーバーからのアクセスを防がない。
家庭専用でも、URLを知った第三者が記録の閲覧・追加・取消を行える状態は避ける。

本格認証は過剰なので、Phase Aで家族共有トークンを導入する。

### 採用方式

- Laravel環境変数: `FAMILY_TOKEN`
- リクエストヘッダ: `X-Family-Token`
- 保護対象: `/api/health` を除く全API
- フロント: 初回入力した「あいことば」を端末保存し、共通API clientがヘッダ付与
- 禁止: トークンをGit、フロントソース、Renderのビルド成果物へ固定埋込み
- 401時: 再入力画面へ戻す
- 失敗試行: Rate Limit
- ローテーション: Laravel Cloudの環境変数変更で実施
- 本番未設定時: 認証を素通しにせず起動失敗または503（fail closed）

## 4. 追加候補のユニーク制約

### 4.1 既存テーブルへ早期追加

| テーブル | 追加制約 | 目的 |
|---|---|---|
| `prompt_templates` | UNIQUE (`routine_template_id`, `prompt_level`, `sort_order`) | 同じ候補文の重複防止 |
| `plan_items` | UNIQUE (`daily_plan_id`, `category`, `sort_order`) | 並び位置重複防止 |
| `reminder_schedules` | `daily_task_id` ごとに `status='scheduled'` は1件の部分UNIQUE | 並行スヌーズによる二重通知防止 |
| `reward_collections` | `task_record_id` が非NULLのとき部分UNIQUE | 1実績を複数獲得契機にしない |

既存の次の制約は維持する。

- `family_members.role`
- `task_definitions(owner_role, slug)`
- `task_records.idempotency_key`
- `task_record_operations.idempotency_key`
- `daily_tasks(task_date, routine_template_id)`
- `prompt_events.idempotency_key`
- `completion_events.daily_task_id`（履歴化までの暫定）
- `daily_plans.plan_date`（人物FK追加までの暫定）
- `reflection_sessions.daily_plan_id`（履歴化までの暫定）
- `reward_collections(family_member_id, milestone_number)`（報酬プログラム追加までの暫定）

### 4.2 統合後の新しいユニーク制約

| テーブル | 制約 |
|---|---|
| `activity_definitions` | `activity_key` |
| `routine_templates` | `slug` |
| `planned_activities` | (`source_type`, `source_key`) |
| `activity_events` | `idempotency_key` |
| `activity_event_participants` | (`activity_event_id`, `family_member_id`, `role`) |
| `activity_event_outcomes` | `activity_event_id`（PK/FK） |
| `activity_event_cancellations` | `activity_event_id`（PK/FK） |
| `prompt_events` | `activity_event_id`（移行後に1対1） |
| `plan_questions` | `question_key` |
| `plan_answer_versions` | (`daily_plan_id`, `question_id`, `version_no`) |
| `reflection_sessions` | (`daily_plan_id`, `revision_no`) |
| `reward_transactions` | `idempotency_key` |
| `reward_transactions` | (`activity_event_id`, `reward_rule_id`, `transaction_type`) |
| `calendar_connections` | (`provider`, `external_calendar_id`) |
| `calendar_events` | (`calendar_connection_id`, `external_event_id`) |
| `calendar_event_versions` | (`calendar_event_id`, `version_no`) |
| `plan_actual_links` | (`planned_activity_id`, `activity_event_id`, `link_type`) |

### 4.3 ユニークにしないもの

- `routine_templates.activity_key`: 朝・夜など同じ活動を複数枠で使うため。
- `prompt_events(daily_task_id, prompt_order)`: 取消後の再記録で過去番号と重なる可能性があるため。
- `plan_items.title`: 同じ文言を別日・別カテゴリで使えるため。
- `activity_event_participants(activity_event_id, role)`: 同じ出来事に複数の支援者・対象者が関われるため。
- `plan_actual_links.activity_event_id`: 1つの出来事が複数の予定へ関係する場合があるため。

## 5. 派生値の二重保存の変更

現状規模ではDB集計で十分なため、次の順序で正本を1つにする。

### 5.1 声かけ集計

1. 既存 `prompt_events` を共通 `activity_events` と参加行へバックフィルする。
2. `prompt_count` と `latest_prompt_at` を、非取消かつ `event_type='prompt'` のイベント集計で返す。
3. 声かけ回数は `planned_activity` または互換 `daily_task` へのリンク単位で数える。
4. 既存キャッシュ値と集計結果を比較するテストを追加する。
5. 本番で不一致がないことを確認する。
6. APIが集計値だけを使う状態になった後、キャッシュ列を差分ALTERで削除する。

推奨インデックス:

```sql
CREATE INDEX activity_events_prompt_time
ON activity_events (event_type, occurred_at DESC)
WHERE event_type = 'prompt';

CREATE INDEX plan_actual_links_event_type
ON plan_actual_links (activity_event_id, link_type);
```

### 5.2 完了状態

1. `completion_events` の上書きを停止し、共通イベント、人物参加、活動結果を追記する。
2. 現在状態は予定へ対応する最新の非取消イベントと結果・人物役割から導出する。
3. 互換APIは導出値を従来の `completion` 形式で返す。
4. 移行完了後 `daily_tasks.status` を削除する。

### 5.3 振り返り完了

1. `reflection_sessions` を複数版対応へ変更する。
2. `review_completed_at` は最新の完了セッションから返す。
3. 互換性確認後 `daily_plans.review_completed_at` を削除する。

### 5.4 残す重複値

次はキャッシュではなく履歴スナップショットなので残す。

- 完了時点のポイント単価
- 日次生成時点の表示名・時刻
- Calendar取込版ごとのタイトル・開始終了時刻

## 6. 履歴化のルール

### 6.1 共通

- 実績・回答・振り返り・ポイント台帳・Calendar取込は物理削除しない。
- 修正は新しい行を追加し、`supersedes_*` または `reverses_*` で以前の行を指す。
- 出来事の取消は `activity_event_cancellations` の追加で表し、元イベント・参加行・固有情報を残す。
- `recorded_by_member_id`、`source`、`recorded_at` を残す。
- APIのDELETEは物理DELETEではなく取消操作とする。

### 6.2 各領域

- 声かけ: 共通イベントを1回ごとに追記し、`prompt_events` は声かけ固有情報として1対1で接続。
- おしごと・家事: 1タップごとに共通イベントと `actor` 参加行を追記し、必要な報酬取引を接続。
- 完了状態: `updateOrCreate` を廃止し、共通イベント、参加行、結果を追記。
- 取消: `activity_event_cancellations` を1イベント1件追加。二重取消は同じ行を返す。
- 娘の見通し: カテゴリ配下のDELETE→再作成を廃止し、`plan_answer_versions` に追記。
- 振り返り: 1日1行上書きを廃止し、`revision_no` ごとに追記。
- ポイント: 既存額の更新ではなく `earn / adjustment / reversal` 台帳。
- Calendar: 更新・取消ごとに `calendar_event_versions` を追記。

## 7. DBレベル制約の変更計画

### 7.1 CHECK制約

PostgreSQL ENUMは使わず、文字列+CHECKとする。

- 人物role
- activity kind
- planned activity source/status
- activity event type/source
- activity participant role
- activity outcome result
- prompt source
- reminder status
- plan answer type
- reward transaction type/kind
- Calendar provider/status
- schedule impact type

数値・日時:

- `point_value >= 0`
- `sort_order >= 0`
- `prompt_level BETWEEN 1 AND 3`
- `prompt_order > 0`
- `daily_limit IS NULL OR daily_limit > 0`
- `amount <> 0`
- 終了日時 >= 開始日時
- `activity_event_cancellations.cancelled_at >= activity_events.occurred_at`
- `lost_minutes >= 0`
- `confidence BETWEEN 0 AND 100`

### 7.2 外部キー削除動作

- `activity_definitions`、`family_members`: `RESTRICT`。無効化で運用。
- 履歴・台帳を参照するFK: `RESTRICT`。
- `activity_events` 配下の参加・結果・声かけ・取消は履歴なので、通常操作で親を削除しない。
- 開発時のロールバックを除き、業務APIからの `CASCADE` 削除へ依存しない。
- `SET NULL` は、参照が消えても履歴の意味を維持できる補助参照だけに限定する。

### 7.3 制約追加前の監査

各ALTER前に次を実施する。

1. 重複候補をSELECTで一覧化。
2. NULL・不正status・負数・日時逆転を計数。
3. 修復方針と件数をログへ保存。
4. バックアップ確認。
5. 制約追加。
6. 本番で制約とインデックスの存在を確認。

## 8. 段階実装

バックエンドとフロントは別ブランチ・別PRにする。各DBフェーズは、原則として
「追加→バックフィル→読取切替→書込切替→旧構造停止」の順で進める。

### 8.0 2026-07-18からの4日間の優先順

ユーザー判断により、家族共有トークンよりDB統合の中核を先に進める。順序は次のとおり。

1. 夏休み対応の本番書き込み確認（`migrate:fresh` は実施済み。再実行しない）
2. Phase Bのうち安定キー・低リスク制約・人物FK
3. Phase Cの活動マスタ統合
4. Phase Dの共通出来事・人物参加・予定接続軸
5. Phase Eのうち娘の見通しから予定へ接続する最小範囲
6. Phase Aの家族共有トークン
7. 支援者向けレポートMVP

DB中核の品質ゲートが木曜午前までに通らない場合は、追加機能へ進まず移行の安全性を優先する。
Phase Aは番号を変更せず、DB中核完了後かつ支援者向け情報提供より前に実施する。

### Phase A: APIアクセス保護

バックエンド:

- `EnsureFamilyToken` ミドルウェア
- `/api/health` 以外の全APIへ適用
- 401共通レスポンス、Rate Limit、CORSプリフライトテスト
- ローカル/テストは明示的なテストトークンを使用し、本番で未設定なら起動失敗または保護APIを503にする

フロント:

- あいことば初回入力
- 共通API clientによるヘッダ付与
- 401時の再入力
- 保存解除・トークン更新導線

完了条件:

- トークンなしで個人データAPIを取得・更新できない。
- トークンをフロント成果物から検索しても固定値が出ない。

### Phase B: 低リスク制約と人物FK

- 既存重複監査
- `routine_templates.slug` をnullableで追加、既存22件をバックフィル、重複監査後にUNIQUE・NOT NULL化
- `KoekakeSeeder` のupsertキーを (`phase`, `name`) から `slug` へ変更
- `prompt_templates` 複合UNIQUE
- `plan_items` 並び順UNIQUE
- `reminder_schedules` 有効1件の部分UNIQUE
- `reward_collections.task_record_id` 部分UNIQUE
- `daily_plans.subject_member_id` 追加、娘でバックフィル、NOT NULL化
- `daily_tasks.subject_member_id` 追加、娘でバックフィル、NOT NULL化
- `daily_plans` UNIQUEを (`subject_member_id`, `plan_date`) へ変更

完了条件:

- 既存件数が変わらない。
- 表示名を変更してSeederを再実行しても `routine_templates` が増殖しない。
- 既存69テストに加え、制約違反テストが通る。

### Phase C: 活動マスタ統合

- `activity_definitions` 作成
- ACTキーを基準に既存 `routine_templates` をバックフィル
- `task_definitions` を対応活動へマッピング
- 対応不明なものは自動統合せずレビュー一覧にする
- `activity_definition_id` FK追加
- Seederの正本を `activity_definitions` へ変更

完了条件:

- 同じACTキーの名称・ラベルが1か所で管理される。
- 全有効 `task_definitions` / `routine_templates` が活動マスタへ接続される。

### Phase D: 共通の出来事・人物参加・予定接続軸

Phase Dは一括リリースにせず、次の順で分ける。

#### D1: 追加専用スキーマ

- `activity_events`
- `activity_event_participants`
- `activity_event_outcomes`
- `activity_event_cancellations`
- `planned_activities`
- `plan_actual_links`（自動マッチング前の最小接続）
- `reward_rules`
- `reward_transactions`
- 既存 `prompt_events` へ nullable `activity_event_id`、`prompt_order`、`prompt_level` を追加
- 既存 `daily_tasks` へ nullable `planned_activity_id` を追加

この段階では旧読取・旧書込を変更しない。新しい必須制約はバックフィル後に追加する。

#### D2: 決定的バックフィル

バックフィルは再実行しても増殖しない決定的キーを使用する。

| 既存データ | 共通イベント | 参加者・結果 | 決定的な冪等キー |
|---|---|---|---|
| `task_records` child | `activity` / `import` | 娘=`actor`、`completed` | `import:task_records:<id>` |
| `task_records` mother | `activity` / `import` | 母=`actor`、`completed` | `import:task_records:<id>` |
| `completion_events.completed` | `activity` / `import` | 娘=`actor`、`completed` | `import:completion_events:<id>` |
| `completion_events.partial` | `activity` / `import` | 娘=`actor`、`partial` | `import:completion_events:<id>` |
| `completion_events.together` | `activity` / `import` | 娘=`actor`、母=`supporter`、`completed` | `import:completion_events:<id>` |
| `completion_events.parent_done` | `activity` / `import` | 母=`actor`、娘=`target`、`completed` | `import:completion_events:<id>` |
| `prompt_events` | `prompt` / `import` | 母=`actor`、娘=`target` | `import:prompt_events:<id>` |

- `recorded_by_member_id` は、既存画面の入力者を基準に、おしごとchild=娘、mother=母、声かけ・完了=母で補完する。
- 推定補完であることは `source='import'` で識別し、既存行の事実以上の支援者情報を推測しない。
- 既存取消日時がある行は、元イベント作成後に `activity_event_cancellations` も作る。
- 既存声かけの `prompt_order` は `daily_task_id` ごとに `prompted_at, id` の順で決定し、取消済みも履歴順へ含める。
- 新規声かけの `prompt_order` は取消を含む最大値+1、画面の推奨レベルは非取消イベント件数から別に導出する。
- `daily_tasks` を `planned_activities` へ変換し、声かけ・完了イベントは `plan_actual_links` で接続する。
- 既存ポイント、調整、取消を `reward_transactions` の `earn | adjustment | reversal` へ変換する。

#### D3: 新旧二重書き込み

- おしごと・家事POSTは、旧 `task_records` と共通イベント・参加・結果・報酬を同一トランザクションで作る。
- 声かけPOSTは、共通イベント・参加行と、互換用 `prompt_events` を同一トランザクションで作る。
- 完了PATCHは `idempotency_key` を受け取る契約へ拡張し、共通イベント・参加・結果を追記する。
- DELETEは旧取消列の更新と `activity_event_cancellations` の追加を同一トランザクションで行う。
- 新規イベントの冪等キーは `oshigoto:<member>:<request-key>`、`koekake-prompt:<request-key>`、
  `koekake-completion:<request-key>` のように入力経路を名前空間化する。
- 共通イベント作成と1件以上の参加行作成は、必ず同じトランザクションで成功・失敗する。

#### D4: 比較と読取切替

- 日別・人物別の出来事件数を旧 `task_records` / `completion_events` / `prompt_events` と比較する。
- ポイント、コイン、節目報酬、取消後集計を旧集計と比較する。
- `completed | partial | together | parent_done` の互換応答を、結果と参加者役割から再構成する。
- 母と娘それぞれのタイムラインを参加行から生成する参照APIを追加する。
- 比較が一致した領域から、新テーブル読取へ個別に切り替える。

#### D5: 旧書込停止

- 十分な本番比較期間を置く。
- 不一致件数が0で、再実行可能な修復手順があることを確認する。
- 領域ごとに旧書込を止める。同じリリースで全旧書込を止めない。
- 旧テーブル・旧列はPhase Iまで削除しない。

完了条件:

- 1イベントに1件以上の参加者があり、人物別タイムラインを同じイベントから生成できる。
- 声かけ、活動、支援を `event_type` と参加者役割で区別できる。
- 取消後も元イベント・参加者・固有情報が残る。
- おしごと、声かけ、完了、ポイントの既存集計と新集計が一致する。
- 既存APIの応答形と1タップ操作が維持される。

### Phase E: 娘の回答履歴化

- `plan_questions`、`plan_answer_versions` 作成
- `plan_items`、`wake_up_time`、`school_start_period` を履歴へバックフィル
- 現行レスポンス互換アダプター実装
- 新規保存を版追加方式へ切替
- `reflection_sessions` のUNIQUEを版番号UNIQUEへ変更
- 回答から予定を作る明示マッピングを追加

完了条件:

- 質問追加がDBマイグレーションなしで可能。
- 回答の変更前後と入力者が追跡できる。
- 「明日なにする」等のうち必要なものだけ `planned_activities` へ接続できる。

### Phase F: 派生キャッシュ除去

- `prompt_count` / `latest_prompt_at` の集計化
- `daily_tasks.status` の実績イベント導出化
- `review_completed_at` の振り返り導出化
- インデックス追加とクエリ計測
- 旧列を参照するコードが0件になってから差分ALTERで削除

完了条件:

- 正本が1つになり、再構築なしで不整合が発生しない。
- 主要APIの応答時間が家庭内利用で問題ない。

### Phase G: Google Calendar取込

- Google OAuth接続はこのフェーズで初めて追加
- `calendar_connections`、`calendar_events`、`calendar_event_versions` 作成
- 増分同期・再同期・取消・タイムゾーン・終日予定をテスト
- 最新版から `planned_activities` を生成
- Calendarイベントと手入力予定の重複候補を表示し、自動削除しない

完了条件:

- 同じ外部イベントを何度同期しても増殖しない。
- Calendar側の変更前後が履歴に残る。
- Calendar取消で実績は消えない。

### Phase H: 予定と出来事の比較

- Phase Dで追加した `plan_actual_links` を利用し、`schedule_impacts` を作成
- まず時間重なり+活動キーで自動候補を出す
- 自動一致は確定扱いせず、`matched_by` と `confidence` を保持
- 手動修正可能にする
- 待機・回復・支援の出来事を関連付ける

完了条件:

- 予定なしの出来事、出来事なしの予定、遅延、中断、短縮、回復への変更を表現できる。
- 娘の見通し、ルーチン、Google Calendarのどの予定も同じ比較処理を使える。

### Phase I: 旧構造の整理

- 十分な運用期間とバックアップ後に実施
- 旧テーブル・旧列の読取が0件であることを確認
- `task_records` / `completion_events` / `plan_items` の保持・アーカイブ・削除を個別判断
- 同一リリースで複数の正本を一度に削除しない

## 9. 推奨PR単位

1. `feat/family-token-api`
2. `feat/family-token-web`
3. `chore/database-constraints`
4. `feat/activity-master-api`
5. `feat/activity-events-schema-api`
6. `feat/activity-events-backfill-api`
7. `feat/activity-events-dual-write-api`
8. `feat/activity-timeline-api`
9. `feat/activity-timeline-web`
10. `feat/plan-history-api`
11. `feat/plan-history-web`
12. `refactor/derived-values-api`
13. `feat/google-calendar-api`
14. `feat/schedule-comparison-api`
15. `feat/schedule-comparison-web`

## 10. 品質ゲート

各DBフェーズで最低限確認する。

- 既存データ件数と集計値の前後比較
- migration up / rollback（安全に戻せる範囲）
- SQLiteテストだけでなくPostgreSQLで部分インデックス・CHECK制約確認
- 冪等再送
- 並行リクエスト
- JST日付境界
- Calendar終日・タイムゾーン・取消・繰り返し予定
- 履歴訂正後も過去版が残ること
- 全 `activity_events` に1件以上の `actor` 参加行があること
- 結果・声かけ・取消・予定対応が、該当しないイベントに空行として作られないこと
- `completed | partial | together | parent_done` の旧応答を人物役割から再構成できること
- バックフィルを2回実行してもイベント・参加・報酬が増殖しないこと
- 新旧二重書き込みの片側失敗でトランザクション全体がロールバックされること
- 旧API契約の互換性
- `php artisan test`
- `./vendor/bin/pint --test`

## 11. 今回は実装しないこと

- 複数家庭対応
- 支援者ごとのアカウント
- 本格的な権限ロール
- Google OAuth実装そのもの
- 既存本番データの削除
- 既存テーブルの即時廃止

Gate 0の本番確認と時刻ずれ修正の本番反映後、最初の実装対象は、8.0の順に
Phase B、Phase C、Phase D1、D2、D3、D4、D5、Phase Eの最小接続とする。
Phase A（家族共有トークン）はDB中核の直後かつ支援者向け情報提供より前に実装する。
