# 実装指示書: 完了記録をトグルからカウント方式へ(task-count)

- 判断の記録: DR-015(`docs/design-decisions.md`)
- 実装担当: Cursor(composer-2.5, fast: false)
- ブランチ: **バックエンド = `feat/task-count-api`、フロント = `feat/task-count-web`**。
  必ず最新 main から切り、別PRにする(AGENTS.md「ブランチ運用」)。**バックエンドを先に**マージ・デプロイする。

## 1. 目的・背景

現状、おしごとのタスクは「1日1回のトグル」:
1回押すと記録され、もう1回押すと取り消しになる。

しかし実際の行動(声かけに応える・お手伝い等)は**1日に何回もする**ものが中心。
トグルだと 2回目のタップが「取り消し」になり、記録が実態と合わない。

**新仕様: 押すたびにカウントが +1 されて記録される。** 取り消しは専用の小さなボタンで
「最後の1回分」を取り消す。

## 2. データモデル方針(1タップ = task_records 1行)

回数カラムを持つのではなく、**1タップ = `task_records` 1行**のイベントログにする。
その日のカウント = その日の有効レコード(`cancelled_at IS NULL`)の件数。

- タップごとの時刻(`completed_at`)が残る → 将来の声かけレポートの素材になる
- 冪等キー(二重送信防止)の仕組みがそのまま使える
- ごほうび計算(`RewardCalculator`)は現在も「有効レコード件数」ベースなので**変更不要**。
  ゲージは「タスク10個」→「タップ10回」で進むようになるが、これは意図した挙動
  (何回もやる動作をそのまま褒める)

## 3. バックエンド変更(`feat/task-count-api`)

### 3-1. マイグレーション(既存CREATEの編集。DR-013 により ALTER 追加は禁止)

`backend/database/migrations/2026_07_16_100003_create_task_records_table.php`

- 部分ユニークインデックス `task_records_active_unique`
  (`family_member_id, task_definition_id, record_date WHERE cancelled_at IS NULL`)を
  **up/down ごと削除**する。これが「1日1タスク1件」を強制していた本体。
- それ以外(カラム・`idempotency_key` unique・`(family_member_id, record_date)` index)は変更しない。
- 本番反映後にユーザーが `php artisan migrate:fresh --seed --force` を実行する(承認済み)。

### 3-2. `App\Services\TaskRecordService::store()`

- **「同日同タスクの有効レコードが既にあれば dedupe して返す」分岐(`$existingActive` まわり)を削除**する。
  新しい冪等キーでの POST は、既存レコードの有無にかかわらず常に新規レコードを作る。
- 冪等キーによる dedupe(同じ `idempotency_key` の再送 → 既存結果を 200 で返す)は**そのまま残す**。
- `recoverFromInsertConflict()` は、ユニーク違反の発生源が
  `idempotency_key`(task_records / task_record_operations)だけになるため、
  `$winner` を「同日同タスクの有効レコード」で探すフォールバック(`$winner ??= ...` の節)を削除して簡素化してよい。
  冪等キー系のリカバリは残すこと。
- レスポンスの形は変えない(record / summary / revealed_reward / meta.deduplicated)。

### 3-3. `App\Services\TaskService::listForMember()`

タスクごとに、その日の有効レコードを集計して返す。

```json
{
  "slug": "greeting",
  "title": "あいさつする",
  "category": null,
  "point_value": 0,
  "sort_order": 1,
  "count": 3,
  "last_record_id": 42,
  "done": true,
  "record_id": 42
}
```

- `count`: その日の有効レコード件数(新規)
- `last_record_id`: 最新の有効レコードの id(新規。`id` 最大のもの。0件なら null)
- `done` / `record_id`: **旧フィールドは互換のため残す**(`done = count > 0`、
  `record_id = last_record_id`)。旧フロントが動いている間のデプロイ猶予のため。
  フロント切替が済んだら削除してよい(別PR)。

### 3-4. `DELETE /api/task-records/{id}`(`cancel`)

変更なし。フロントが `last_record_id` を渡して「最後の1回」を取り消す用途に使う。

### 3-5. テスト

既存テストの前提(2回目のPOSTはdedupe)をカウント方式に合わせて更新し、以下を追加:

1. 別々の冪等キーで同日同タスクに2回 POST → レコード2件、GET /tasks の `count` = 2
2. 同じ冪等キーで再送 → 201→200 dedupe、レコードは増えない(既存挙動の維持確認)
3. DELETE で1件取り消し → `count` が 1 減る・summary が再計算される
4. タップ10回でごほうび付与(milestone)が発火する(既存ロジックがカウント方式でも動く確認)

### 3-6. 品質ゲート

`php artisan test` 緑 + Pint/型チェック(プロジェクト標準)緑。

## 4. フロント変更(`feat/task-count-web`)

バックエンドのマージ・デプロイ後に着手。

### 4-1. スキーマ(`frontend/src/api/schemas/oshigotoSchema.ts`)

`taskSchema` の `done` / `record_id` を `count: z.number().int()` /
`last_record_id: z.number().int().nullable()` に置き換える(新契約のみ読む)。

### 4-2. タスク行 UI(`frontend/src/features/oshigoto/components/TaskRow.tsx` ほか)

- **行タップ = 常に +1**。トグルではない。タップのたびに既存の「+1」アニメーションを出す。
- 右端の ✓ 丸は**回数バッジ**に変える: 0回 = 空の丸、1回以上 = 回数の数字(例「3」)。
  1回以上のときの配色は現在の done 状態(ローズ)を流用。
- **取り消し**: count が 1 以上の行にだけ、小さな「−」ボタン(とりけし)を回数バッジの近くに表示。
  タップで最後の1回分を取り消す。
  現在 TaskRow 全体が 1 つの `<button>` なので、button の入れ子にならないよう
  行をコンテナ(div)+ メインボタン + 取り消しボタンに分割すること。
  取り消しボタンは誤タップしにくいよう本体タップ領域と明確に分離する(最低 40px 角のタッチターゲット)。
- aria: `aria-pressed` は廃止し、`aria-label` を「(タスク名)、きょう3回」のような形に。
  取り消しボタンは `aria-label="(タスク名)を1回とりけす"`。
- 母側(`mama-kaji` の `KajiTaskRow`)も同じ方式に合わせる。

### 4-3. 永続化フック(`frontend/src/features/taskRecords/useTaskPersistence.ts`)

`toggleTask(slug)` を廃止し、以下の2つに分ける:

- `incrementTask(slug)`: 楽観的に `count + 1`(summary の `today_done_count` / `gauge_count` も +1、
  現行の楽観更新ロジックを流用)→ create オペレーションを enqueue して送信。
  同じタスクに複数の pending create が積まれてよい(キューは従来どおり member 単位で直列処理)。
- `decrementTask(slug)`: 楽観的に `count - 1`(0未満にしない)。取り消し対象の決め方:
  1. 未送信の pending create がそのタスクにあれば、**最新のものをキューから外す**だけ(API 不要)
  2. なければ `last_record_id` に対して cancel オペレーションを enqueue
- create 成功時は該当タスクの `count` と `last_record_id` をサーバ応答で確定させる。
  現行の「stillDone === false なら補償 cancel を積む」分岐はトグル前提なので削除し、
  カウントの整合は **サーバ summary を唯一の真実とする方針(DR-008)** で、
  確定応答・refetch で収束させる。
- オフライン中の +/− 連打などの複雑な境界は、既知の並行系バックログ
  (`docs/wip/phase5-followup-fixes.md`)と同様「後続で根治」でよい。
  このPRでは「オンラインで普通に押す・取り消す」が正しく動くことを優先する。

### 4-4. テスト

`OshigotoPersistence.test.tsx` ほか既存テストをカウント方式に更新し、以下を担保:

1. 3回タップ → POST が3回(冪等キーは毎回別)・バッジが「3」
2. 「−」タップ → 最新レコードに DELETE・バッジが減る
3. 未送信の pending create がある状態で「−」 → API を呼ばずキューから除去
4. ごほうび演出(reveal)がカウント方式でも従来どおり出る

### 4-5. 品質ゲート

lint / typecheck / test / build すべて緑。

## 5. やらないこと(スコープ外)

- 記録を見る画面(別スペック: `docs/wip/records-view/records-view-spec.md`)
- push通知・声かけ(K1)関連
- 並行系の既知不具合(H1〜3)の根治
- `stamp_size`(10回で1スタンプ)の調整。進みが速すぎる場合は config 変更だけで済む設計を維持
- 図鑑 / USJ / グッズ画面のデータ接続(Phase 5b のまま)

## 6. デプロイ・検証手順

1. `feat/task-count-api` → PR → main マージ(Laravel Cloud 自動デプロイ)
2. ユーザーが Laravel Cloud Commands で `php artisan migrate:fresh --seed --force`(1回だけ)
3. `feat/task-count-web` → PR → main マージ(Render 自動デプロイ)
4. スモーク(Codex 委譲): `docs/wip/codex-smoke-request-phase8.md` は**トグル前提のため
   カウント方式に改訂してから**実行する(改訂は Fable が行う)
