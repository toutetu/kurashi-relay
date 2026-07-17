# くらしリレー 声かけ中心化 変更計画 01(K0〜K4)

- 作成日: 2026-07-17
- 作成: Fable(設計・レビュー担当)
- 参照:
  - 要件: `docs/archive/requirements/くらしリレイ_要件定義_v0.4.md`(表記は DR-002 により「くらしリレー」に統一済み)
  - 設計: `docs/archive/requirements/くらしリレイ_基本設計_v0.2.md` + ワイヤーフレーム2枚
  - 判断: `docs/design-decisions.md` DR-012(役割再割当て)/ DR-013(DBリセット・CREATE編集方針)

## 0. 決定済み事項(ユーザー確認 2026-07-17)

1. 新機能「声かけリマインダー」をアプリの中心に据える。既存機能は**置換せず役割再割当てで共存**。
2. 進めるのは「ステップ1(母用声かけリマインダー)」「ステップ2(娘用ホーム)」。
   **母のホーム差し替えは保留** — 新画面を実機でしばらく使ってから判断する。
3. 実運用前のため**DBは破棄・再作成してよい**。
4. マイグレーションは**ALTER追加ではなく既存CREATEの編集**で管理する(実運用開始まで。DR-013)。

---

# 1. 現状(2026-07-17時点)

## 1-1. インフラ

| 要素 | 場所 | 状態 |
|---|---|---|
| Laravel API | Laravel Cloud `https://kurashi-relay-production-olnfy0.laravel.cloud` | 稼働中。main へのコミットで自動デプロイ。**migrate は自動実行されない**(Commands タブで手動) |
| DB | Laravel Serverless Postgres 17(Singapore・Dev構成) | 稼働中。実データはテスト2件(record_id 3,4)のみ → K0 で破棄可 |
| フロント | Render Static Site `kurashi-relay-web` | Phase 7 で接続先を Laravel Cloud へ切替済み |
| 旧 Render API | `kurashi-relay-api.onrender.com` | ロールバック先として残置(Phase 8b まで停止しない) |

## 1-2. 既存スキーマ(すべて oshigoto/mamakaji ドメイン)

- CREATE 6本: `family_members` / `task_definitions` / `task_records` / `reward_collections` /
  `reward_adjustments` / `task_record_operations`
- ALTER 1本: `2026_07_17_000002_add_granted_point_value_to_task_records_table.php` → **K0 で CREATE に統合して削除**

## 1-3. 既存API

`/api/health` `/api/dashboard` `/api/tasks` `/api/task-records`(POST/DELETE) `/api/rewards/summary` `/api/rewards/collections`

## 1-4. 進行中の別ワークストリーム(本計画と並走)

- Phase 8a: 本番安定確認の curl スモーク(Codex委譲・未実施)→ **K0 のDBリセット後に実行する**(観測データが一貫する)
- Phase 5 フォローアップ修正(並行系 H1〜3/M1〜3・`docs/deploy_change/phase5-followup-fixes.md`)→ 未着手のまま有効

---

# 2. 全体方針: 役割の再割当て(DR-012)

```text
アプリの中心 = 母用「声かけリマインダー」(新規 /koekake)
  ├─ 朝・夕方・夜タブ + 1タップ「声かけ済み」記録
  └─ 声かけ回数・時刻の自動記録 = 母の支援量の可視化

娘の利用 = 「帰宅後」と「19時(夕食後)」の2場面だけ(新規 /musume)
  ├─ 見通し3項目(今日する事・明日いる物・明日何時間目から)
  ├─ 19時の振り返り(通常/夏休みモード)
  └─ おしごと(ハロウィン・ラリー)への入口 ← 既存機能はここに再配置
       ※おしごとは「帰宅後・振り返り時にまとめて記録する楽しみ」として無傷で残す

既存の母ホーム(B案v3・活動記録) = 当面そのまま
  └─ /koekake を実機でしばらく使い、差し替え/統合は後で判断(K4)
```

- 既存 `child-plan` は K2 で娘用見通し(D-02〜D-04)へ発展統合する。
- 既存の設計原則(監視しない・評価しない・入力ファースト)は新要件と整合しており、変更しない。

---

# 3. フェーズ分割

| フェーズ | 内容 | 実装 | 検証 |
|---|---|---|---|
| **K0** | マイグレーション統合 + DB破棄・再作成 | Cursor(小)or Codex | Codex(ローカルfresh+test)、本番はユーザーがCommands実行 |
| **K1** | 母用声かけリマインダー(バックエンド→フロント) | Cursor composer-2.5 | Codex curlスモーク + ユーザー実機 |
| **K2** | 娘用ホーム D-01/D-05 + おしごと入口 | Fableモック → Cursor | 同上 |
| **K3〜** | バックログ(§7) | 都度判断 | — |
| **K4** | 母ホーム差し替え/統合の判断 | — | ユーザーの実機運用の感触で決定 |

K1 のバックエンドとフロントは別ブランチ・別PRに分ける(既存 oshigoto 永続化と同じ進め方)。

---

# 4. K0: マイグレーション統合とDBリセット

## 4-1. 変更内容

1. `2026_07_16_100003_create_task_records_table.php` の CREATE 内に
   `$table->unsignedSmallInteger('granted_point_value')->default(0);` を追加
   (位置は `idempotency_key` の後ろ。ADD側にあったバックフィル処理は fresh 前提のため不要)。
2. `2026_07_17_000002_add_granted_point_value_to_task_records_table.php` を**削除**。
3. 廃止テスト `OshigotoPersistenceTest::test_granted_point_value_migration_backfills_existing_records`
   を**削除**(削除する ADD ファイルを直接 `require` しているため放置すると fatal。
   Fable レビューで発覚・2026-07-17)。直前の `test_mother_points_use_the_value_granted_when_recorded`
   は作成時スナップショットの検証なので残す。
4. ローカルで `php artisan migrate:fresh --seed` → `php artisan test` が緑であること。

> 実装指示書(コピペ用): `docs/koekake-k0-cursor-request.md`

## 4-2. 本番リセット手順(ユーザー操作・Commands タブ)

main マージ&自動デプロイ後に、Laravel Cloud の Commands タブで:

```bash
php artisan migrate:fresh --seed --force
```

- **一回限りの承認済み操作**(2026-07-17 ユーザー承認・DR-013)。テスト実データ(record_id 3,4)は消える(承認済み)。
- 以後「本番で migrate:fresh 禁止」ルールは復活する。ただし実運用開始までに既存CREATEを編集した場合のみ、
  同じ手順で再リセットする(その都度この計画書に追記)。
- K1以降の**新規テーブル追加だけ**なら fresh 不要。通常の `php artisan migrate --force` でよい。

## 4-3. リセット後

- Phase 8a の curl スモーク(`docs/deploy_change/codex-smoke-request-phase8.md`)を実行する(Codex委譲)。

---

# 5. K1: 母用声かけリマインダー

## 5-1. データモデル(新規CREATE 6本・oshigotoとは独立ドメイン)

基本設計 v0.2 §10 をベースに、以下を現行構成へ合わせて簡略化する:

- **households / users(UUID)は導入しない**。単一世帯前提で、人は既存 `family_members` を流用。
  複数子ども対応は実運用開始後に ALTER で行う(基本設計§18の将来要件は認識した上で先送り)。
- id は既存踏襲で bigint(UUIDにしない)。タイムゾーンは APP_TIMEZONE=Asia/Tokyo を前提に
  「当日」判定は既存 `task_records.record_date` と同じ流儀で行う。

```text
routine_templates      … 声かけ対象の定義(テンプレ)
  id / phase(morning|evening|night) / name(50) / icon(絵文字16) /
  default_time(time, null可) / sort_order / is_active / timestampsTz
  index(phase)

prompt_templates       … 声かけ文テンプレ
  id / routine_template_id FK(cascade) / prompt_level(1=1回目,2=2回目,3=3回目以降) /
  text(200) / is_preferred(default false) / sort_order / timestampsTz

daily_tasks            … 当日タスク(テンプレから日次生成)
  id / task_date(date) / routine_template_id FK / phase / name / icon (←生成時にコピー) /
  scheduled_at(tz, null可) / status(20, default 'scheduled') /
  prompt_count(cache, default 0) / latest_prompt_at(cache, null可) / timestampsTz
  unique(task_date, routine_template_id) / index(task_date, phase)

prompt_events          … 声かけイベント(正本)
  id / daily_task_id FK / prompted_at(tz) / prompt_order / prompt_text(200) /
  source(template|edited|custom) / idempotency_key(64) unique /
  cancelled_at(tz, null可) / timestampsTz
  index(daily_task_id, prompted_at)

completion_events      … 行動結果(1タスク最大1行・upsert)
  id / daily_task_id FK unique /
  status(completed|partial|together|parent_done|deferred|unknown) /
  completed_at(tz) / note(200, null可) / timestampsTz

reminder_schedules     … 再通知予定(K1では画面内表示のみ・push無し)
  id / daily_task_id FK / remind_at(tz) / status(scheduled|fired|cancelled) / timestampsTz
  index(daily_task_id, status)
```

設計原則(基本設計§18 準拠):

- `prompt_events` が正本。`daily_tasks.prompt_count / latest_prompt_at` はキャッシュで、
  非キャンセルイベントの集計から常に復元可能にする。
- 声かけ記録(prompt_events)と完了記録(completion_events)は絶対に混ぜない。
- 文言(声かけ文)はハードコードせず `prompt_templates` シードで管理。

## 5-2. シードデータ

`KoekakeSeeder`(仮称)で投入:

- ルーチン: 基本設計 §5-2 の朝8・夕方6・夜8タスク(名前・絵文字・並び順・目安時刻)。
- 声かけ文: 各ルーチンに level 1〜3 の文例(FR-M08 の例 + §6「回数別の文例」)。
  **FR-M10 の禁止表現を含めないこと**(何回言ったら分かるの/まだできていない/約束を守って/ママが困る/
  ちゃんとしなさい/明日行くって言ったでしょ/できないと困るよ)。

## 5-3. API契約(スケッチ・実装スペックで確定)

すべて `/api/koekake/` 配下。既存APIには触らない。

```text
GET  /api/koekake/tasks?date=YYYY-MM-DD&phase=morning|evening|night
  → その日の daily_tasks を返す。無ければ is_active なテンプレから遅延生成
    (unique(task_date, routine_template_id) を衝突ガードに upsert。並行GETでも安全)。
  → カード表示に必要な全部: id, name, icon, phase, status, prompt_count,
    latest_prompt_at, next_remind_at, suggested_prompt{text, level, source}, completion{status}
    ※suggested_prompt は「次が何回目か」(prompt_count+1) に応じた level の文を返す

POST /api/koekake/prompt-events
  body: { daily_task_id, prompt_text, source, idempotency_key }
  → 201 { prompt_event_id, prompt_count, latest_prompt_at }(サーバ値が唯一の真実・DR-008踏襲)
  → 同一 idempotency_key の再送は 200 で同じ内容(既存 task_records の冪等パターンを踏襲)

DELETE /api/koekake/prompt-events/{id}
  → cancelled_at を立てて取消。再計算後の prompt_count を返す。
    10秒Undoはフロント表示の要件。サーバは「当日イベントのみ取消可」の制限に留めて簡素化。

PATCH /api/koekake/tasks/{id}/completion
  body: { status }  → completion_events を upsert(6状態)

POST /api/koekake/tasks/{id}/snooze
  body: { minutes: 5|10|15 } または { remind_at } または { none_today: true }
  → 既存 scheduled をキャンセルして新規作成(none_today は当日分キャンセルのみ)

GET  /api/koekake/tasks/{id}
  → 詳細: 当日の非キャンセルイベント履歴 + level別の声かけ候補一覧 + completion
```

実装注意(Phase 5 の教訓 DR-010 を最初から織り込む):

- 書き込み系は全てトランザクション + 冪等キー。応答には常にサーバ集計値を含め、フロントはそれで上書きする。
- 二重押下は「同一秒・同一タスク」ではなく冪等キーで防ぐ(基本設計§14より堅い方式に倒す)。

## 5-4. フロントエンド(新規ルート `/koekake`)

- `src/pages/KoekakePage.tsx`(M-01)+ `src/features/koekake/`。既存画面には触らない。
  AppShell のナビに「声かけ」を追加(母向け導線)。
- M-01: `SegmentedTabs` で 朝/夕方/夜(現在時刻で初期選択)。タスクカードは
  タスク名・絵文字・回数・最新時刻・次回通知・推奨文・[声かけ済み][5分後][詳細]。
- 「声かけ済み」= 最も押しやすい主ボタン。押下→+1フライ演出→10秒Undoトースト(B案v3の押し心地)。
- M-02(詳細)はシートまたは配下ルート: 当日履歴・候補切替(この文を使う/別候補/編集して声かけ済み)・
  完了状態6択(完了/一部/一緒に/代行/後日/未確認)。
- デザイン: B案v3 準拠・母用は落ち着いた寒色(既存トークンから。画面固有カラーコード禁止)。
  回数は評価でなく記録として中立表示(「就寝 4回」を失敗色にしない)。
  母用ワイヤーフレーム PNG(`docs/archive/requirements/`)を正とし、モック作成は省略してスペック直行。
- 通信層は `features/taskRecords` のパターンを参考にしつつ、**mutation はタスク単位で直列化**し
  サーバ応答値で state を確定する(H1〜3 の再発防止を新規実装では最初から)。

## 5-5. K1 のスコープ外(意図的に落とすもの)

- **push/ローカル通知は入れない**(FR-M12/M13 の通知配信)。Webアプリのままでは端末通知に
  PWA/Service Worker 化が必要なため K3 で判断。K1 は「次回通知時刻の画面内表示 + 期限到来カードの強調」まで。
- 声かけ文の「今後この文を優先する」(is_preferred の学習的運用)・音声読み上げ(FR-M11)・
  週次レポート・支援者共有 → K3以降。

---

# 6. K2: 娘用ホーム(D-01/D-05)+ おしごと入口

## 6-1. データモデル(新規CREATE 3本)

```text
daily_plans          … 娘の日次計画
  id / plan_date(date) unique / school_start_period(20, null可) /
  mode(school|summer|holiday|outing, default school) /
  review_completed_at(tz, null可) / timestampsTz

plan_items           … 計画の項目
  id / daily_plan_id FK / category(today_task|tomorrow_item|memo) /
  title(100) / status(20) / sort_order / timestampsTz

reflection_sessions  … 19時の振り返り
  id / daily_plan_id FK / mode(normal|summer) / started_at / completed_at(null可) /
  note(200, null可) / timestampsTz
```

## 6-2. 画面(新規ルート `/musume`)

- D-01 娘用ホーム: 見通し3項目(今日何をする?/明日何がいる?/明日何時間目から登校?)を最上部に大きく。
  「母と決める」「今は決めない」を常に選べる。未完了の赤字表示はしない。
- D-05 19時の振り返り: 通常/夏休みモード切替。完了で `review_completed_at` を立て、
  母用 `/koekake` に「確認完了」を表示。
- **おしごと(ハロウィン・ラリー)への入口**をD-01に置く(既存 `/oshigoto` へのリンク。おしごと自体は無変更)。
- 既存 `/child-plan` は見通し3項目へ発展統合(ルートは残してリダイレクト。実装時に判断)。
- デザイン: 基本設計§17は「娘用=やわらかい暖色」だが、娘の好みは紫ゴスロリ(既存おしごとの世界観)。
  **K2はFableがモックを先に作り、ユーザー(と娘)の確認後に実装スペック化する**(Artifactリンクで納品)。

## 6-3. K2 のスコープ

- 入る: 3項目の入力(選択肢+短文+「母と決める」「今は決めない」)・振り返りフロー・母画面への反映表示。
- 落とす(K3へ): 見通し→母用リマインドの自動生成(登校時限からの逆算・FR-M14)、音声入力、写真メモ、時間割連携。
  K2時点では「娘の見通しが母のkoekake画面から参照できる」まで(自動生成はその次)。

---

# 7. K3以降のバックログ(着手順は都度判断)

1. 見通し→母用タスクの自動生成(登校時限の逆算・今日する事からの生成・FR-M14/基本設計§11)
2. 通知(PWA化 + Web Push)— K1実機運用で「画面内表示だけで足りるか」を見てから
3. 日次・週次レポート(FR-R01〜03)— prompt_events が正本なので後付け可能
4. 夏休み・休日・USJモードの本格運用(mode列は先行して持つ)
5. 声かけ文の優先設定・編集学習(FR-M09後半)
6. Phase 5 フォローアップ修正 H1〜3/M1〜3(既存バックログ・K1実装と同じ直列化パターンで)
7. **K4: 母ホームの差し替え/統合判断**(実機運用の感触で。統合する場合は既存クイック記録・体調カードとの同居案)

---

# 8. 実装分担・検証(恒常ルール準拠)

| 作業 | 担当 |
|---|---|
| 実装スペック作成・差分レビュー・K2モック | Fable |
| 実装(K0/K1/K2) | Cursor composer-2.5(fast: false)。難所のみ Codex 上位 |
| バックエンド検証 | Codex に curl スモーク依頼書を渡して実行(Fableは合否レポートのみ読む) |
| ローカル品質確認 | 実装者(lint / typecheck / test / build) |
| 本番 migrate / ダッシュボード操作 | ユーザー(手順書を渡す・Commands タブ) |
| 実機確認 | ユーザー |

進行順(次セッションからの動き方):

1. K0 実装スペック(§4がそのまま指示書)→ Cursor へ → ローカル緑 → main マージ → ユーザーが本番 fresh → 8a スモーク
2. K1 バックエンド実装スペック作成(§5-1〜5-3 を詳細化)→ Cursor → Fableレビュー → Codex curlスモーク → main → `migrate --force`
3. K1 フロント実装スペック作成(§5-4)→ Cursor → Fableレビュー → ユーザー実機
4. K2 モック(Fable)→ ユーザー確認 → 実装スペック → 同上

---

# 9. リスク・注意

- **main は自動デプロイ**される。バックエンドを main にマージするタイミング = 本番反映なので、
  マージ前に Codex レビューを済ませる(migrate は手動なので新テーブルが無い間もアプリは動くが、
  ルートだけ先に出ないよう PR 単位をそろえる)。
- 娘用画面に声かけ回数を出さない(基本設計§15)。K1/K2 は画面分離でこれを担保(認証はまだ無い前提)。
- 声かけ文テンプレの文言は禁止表現チェック(FR-M10)をレビュー観点に含める。
- おしごとの世界観・演出には一切手を入れない(娘のモチベーションの核)。
- DB休止(300秒)からのコールドスタートで初回APIが遅い既知事象は koekake でも同様に出る。
  8a の観測結果を UI のローディング表示設計に反映する。
