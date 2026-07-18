# K1 実装指示書: 母用声かけリマインダー(バックエンド+フロント統合)

- 作成日: 2026-07-18
- 作成: Fable(設計・レビュー担当)
- 実装: Cursor composer-2.5(fast: false)。難所のみ Codex 上位。
- 参照:
  - 計画: `docs/koekake-plan-01.md` §5(K1)
  - 基本設計: `docs/archive/requirements/くらしリレイ_基本設計_v0.2.md` §5〜§9
  - 要件: `docs/archive/requirements/くらしリレイ_要件定義_v0.4.md` FR-M08〜M13
  - データの持ち方の参照元: `docs/archive/requirements/くらしリレイ_娘の自主活動記録_Fable用設計書_v0.1.docx`
    (以下「docx設計書」。取り込み方針は DR-019・本書 §9)
- 表記: アプリ内の用語は「声かけ」に統一する(docx設計書の「声掛け」は取り込み時に変換)。

## 0. docx設計書との整合方針(ユーザー確認 2026-07-18・DR-019)

docx設計書と既存K1計画のバッティング4点は、以下で確定済み。実装で迷ったらこちらが正。

1. **記録テーブルは分離を維持**。`prompt_events`(声かけ)と `completion_events`(完了)を混ぜない
   (基本設計§18)。docx設計書の単一テーブル案(record_type)は不採用。
2. **声かけ文は両方持つ**。マスタに `parent_prompt_label`(記録用の基本文言)を持ちつつ、
   回数別文例の `prompt_templates`(FR-M08)も維持する。
3. **K1のスコープは母用のみ**。娘側画面・ポイント・クイック記録・履歴・設定は入れない。
   docx設計書の提案は「データの箱」(activity_key・3ラベル・daily_limit・display_rule)としてマスタに
   取り込み、K2以降で整理する(§9)。
4. **日種別判定エンジンは入れない(簡易版)**。当日タスク生成は is_active + phase のみ。
   `display_rule` は箱(null)として持つだけで、K1では評価しない。

追加指示(ユーザー 2026-07-18):

5. **ACTキーは全ルーチンに網羅する**。docx設計書に対応が無いルーチン(起床・服薬・出発など)には
   本アプリ側で ACT-037〜045 を新規発行する(§3-2の表が発行記録の正。docx改訂時に同期)。
   3ラベル(child_label / quick_label)も全ルーチン分を埋める。
6. **マスタは将来ユーザー編集可能にする方針**(ルーチン・声かけ文・時刻を設定画面から修正。K3/F-05系)。
   K1はシーダー投入のみだが、この前提で文言・時刻は必ずDBデータとして持つ(ハードコード禁止)。
7. **娘ポイント制は既存おしごと報酬の拡張で実装する**(K2)。別のポイント経済は作らない(§9-4)。

## 1. スコープとPR分割

| PR | ブランチ | 内容 |
|---|---|---|
| PR1 | `feat/koekake-backend` | マイグレーション6本・モデル・シーダー・API6本・Pest featureテスト |
| PR2 | `feat/koekake-frontend` | `/koekake` 画面(M-01/M-02)・通信層・vitest+MSW契約テスト |

- どちらも**最新mainから切る**(相乗り禁止・DR-014)。PR2はPR1マージ+本番migrate後に着手。
- **既存コードに触らない**: 既存API・既存画面・既存マイグレーションは変更禁止。
  変更してよい既存ファイルは `routes/api.php`(ルート追記)、`DatabaseSeeder.php`(シーダー呼び出し追記)、
  `App.tsx`(ルート追記)、AppShellナビ(項目追記)のみ。
- K0は完了済み(CREATE6本に統合済み)。**K1は新規テーブルのみなので本番は `migrate --force` でよい**
  (fresh不要・計画§4-2)。

### スコープ外(実装しないこと)

- push/ローカル通知(FR-M12/M13の配信)。K1は「次回通知時刻の画面内表示+期限到来カードの強調」まで。
- 「今後この文を優先する」の学習的運用(`is_preferred` は列だけ用意)・音声読み上げ(FR-M11)・
  週次レポート・支援者共有。
- 娘側画面・ポイント付与・クイック記録・日種別判定(§9参照)。
- 認証(DR-007踏襲。既存APIと同じく保護なし)。

---

# バックエンド(PR1)

## 2. マイグレーション(新規CREATE 6本)

`backend/database/migrations/` に以下を作成。型・命名は既存 `2026_07_16_100003_create_task_records_table.php`
の流儀(`timestampsTz` / `timestampTz` / string長指定 / `idempotency_key` unique)に合わせる。

### 2-1. `2026_07_18_100001_create_routine_templates_table.php`

```php
Schema::create('routine_templates', function (Blueprint $table) {
    $table->id();
    $table->string('activity_key', 16)->nullable()->index(); // ACT-xxx。非ユニーク(同一活動が朝夜2枠等)。全ルーチンに設定(§3-2)
    $table->string('phase', 20);                    // morning | evening | night(アプリ層で検証。将来 anytime 追加余地)
    $table->string('name', 50);                     // 母用画面のタスク名
    $table->string('icon', 16);                     // 絵文字
    $table->string('parent_prompt_label', 100)->nullable(); // 記録用文言「〜するように声をかけた」
    $table->string('child_label', 50)->nullable();  // 娘側ラベル(K2用の箱。docx対応分のみ)
    $table->string('quick_label', 50)->nullable();  // クイック記録用短ラベル(K2用の箱)
    $table->time('default_time')->nullable();       // 目安時刻(scheduled_at生成用)
    $table->unsignedSmallInteger('daily_limit')->nullable(); // docxの1日上限(K1では評価しない箱)
    $table->json('display_rule')->nullable();       // docx§7.5の表示条件(K1では評価しない箱)
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->boolean('is_active')->default(true);
    $table->timestampsTz();

    $table->index('phase');
});
```

### 2-2. `2026_07_18_100002_create_prompt_templates_table.php`

```php
Schema::create('prompt_templates', function (Blueprint $table) {
    $table->id();
    $table->foreignId('routine_template_id')->constrained('routine_templates')->cascadeOnDelete();
    $table->unsignedTinyInteger('prompt_level');    // 1=1回目 / 2=2回目 / 3=3回目以降
    $table->string('text', 200);
    $table->boolean('is_preferred')->default(false); // K1では未使用(箱)
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestampsTz();

    $table->index(['routine_template_id', 'prompt_level']);
});
```

### 2-3. `2026_07_18_100003_create_daily_tasks_table.php`

```php
Schema::create('daily_tasks', function (Blueprint $table) {
    $table->id();
    $table->date('task_date');
    $table->foreignId('routine_template_id')->constrained('routine_templates');
    $table->string('phase', 20);                    // 生成時にテンプレからコピー(スナップショット)
    $table->string('name', 50);                     // 同上
    $table->string('icon', 16);                     // 同上
    $table->timestampTz('scheduled_at')->nullable(); // task_date + default_time(Asia/Tokyo)。default_timeがnullならnull
    $table->string('status', 20)->default('scheduled'); // scheduled | 完了6状態のミラー(§4-5参照)
    $table->unsignedSmallInteger('prompt_count')->default(0);  // キャッシュ: 非キャンセルprompt_events件数
    $table->timestampTz('latest_prompt_at')->nullable();       // キャッシュ: 非キャンセルの最新prompted_at
    $table->timestampsTz();

    $table->unique(['task_date', 'routine_template_id']); // 遅延生成の衝突ガード
    $table->index(['task_date', 'phase']);
});
```

### 2-4. `2026_07_18_100004_create_prompt_events_table.php`(声かけの正本)

```php
Schema::create('prompt_events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('daily_task_id')->constrained('daily_tasks');
    $table->timestampTz('prompted_at');
    $table->unsignedSmallInteger('prompt_order');   // 記録時点の「何回目か」スナップショット(表示にはprompt_countを使う)
    $table->string('prompt_text', 200);
    $table->string('source', 20);                   // template | edited | custom
    $table->string('idempotency_key', 64)->unique();
    $table->timestampTz('cancelled_at')->nullable(); // 取り消しは物理削除せずここに記録
    $table->timestampsTz();

    $table->index(['daily_task_id', 'prompted_at']);
});
```

### 2-5. `2026_07_18_100005_create_completion_events_table.php`

```php
Schema::create('completion_events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('daily_task_id')->unique()->constrained('daily_tasks'); // 1タスク最大1行(upsert)
    $table->string('status', 20);                   // completed|partial|together|parent_done|deferred|unknown
    $table->timestampTz('completed_at');
    $table->string('note', 200)->nullable();
    $table->timestampsTz();
});
```

> docx設計書の「自立度」(自分から/声かけ後/一緒に/手伝いあり)は列を持たない。
> 自分から=完了時にprompt_count=0、声かけ後=prompt_countあり、一緒に=status together、
> 手伝いあり=status partial として**イベントから導出可能**なため(K2/K3のレポートで導出する)。
> docxの `linked_record_id` も不要(daily_task_id で声かけと完了が同一タスクに紐づく)。

### 2-6. `2026_07_18_100006_create_reminder_schedules_table.php`

```php
Schema::create('reminder_schedules', function (Blueprint $table) {
    $table->id();
    $table->foreignId('daily_task_id')->constrained('daily_tasks');
    $table->timestampTz('remind_at');
    $table->string('status', 20)->default('scheduled'); // scheduled | cancelled(firedはK3の通知実装まで未使用)
    $table->timestampsTz();

    $table->index(['daily_task_id', 'status']);
});
```

## 3. モデル・シーダー

### 3-1. モデル

`backend/app/Models/` に `RoutineTemplate` / `PromptTemplate` / `DailyTask` / `PromptEvent` /
`CompletionEvent` / `ReminderSchedule`。既存モデルの流儀(fillable・casts)に合わせる。
リレーション: RoutineTemplate hasMany PromptTemplate・DailyTask。DailyTask hasMany PromptEvent・
ReminderSchedule、hasOne CompletionEvent、belongsTo RoutineTemplate。

### 3-2. `KoekakeSeeder`

`DatabaseSeeder` から呼ぶ。再実行安全にする: routine は `updateOrCreate` キー `(phase, name)`、
prompt_templates はキー `(routine_template_id, prompt_level, sort_order)`。

#### ルーチン定義(基本設計§5-2の22本+docx設計書のACTマッピング)

- `activity_key` は**全ルーチンに設定する**。ACT-036以前は docx設計書 §5 の活動マスタの既存キー、
  **ACT-037〜045 は本アプリ側で新規発行**(ユーザー指示 2026-07-18。下表が発行記録の正であり、
  docx設計書の改訂時にこの表と同期する)。キー運用ルールは docx§4.1 を踏襲:
  一度発行したら変更しない・別活動へ再利用しない・廃止キーはデータ上に残す。**ACT-023 は欠番**(使用しない)。
- `default_time` は**プレースホルダ**(実運用の時刻はユーザー実機確認で調整。シーダー修正のみで変更可)。
- `daily_limit` は docx の上限値を転記、新規発行分は Fable が設定(K1では評価しない)。

| # | phase | sort | name | icon | activity_key | daily_limit | default_time | parent_prompt_label | child_label(箱) | quick_label(箱) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | morning | 1 | 起床 | ⏰ | ACT-037 | 1 | 07:00 | 起きるように声をかけた | 自分で起きた | 起床の声かけ |
| 2 | morning | 2 | 朝食 | 🍞 | ACT-004 | 3 | 07:20 | ご飯を食べるように声をかけた | ご飯を食べた | 食事の声かけ |
| 3 | morning | 3 | 歯磨き | 🪥 | ACT-005 | 2 | 07:40 | 歯をみがくように声をかけた | 歯をみがいた | 歯みがきの声かけ |
| 4 | morning | 4 | 服薬 | 💊 | ACT-038 | 2 | 07:45 | 薬を飲むように声をかけた | 薬を飲んだ | 服薬の声かけ |
| 5 | morning | 5 | 着替え | 👕 | ACT-003 | 1 | 07:50 | 着替えるように声をかけた | 着替えた | 着替えの声かけ |
| 6 | morning | 6 | 日焼け止め | 🧴 | ACT-039 | 1 | 08:00 | 日焼け止めを塗るように声をかけた | 日焼け止めを塗った | 日焼け止めの声かけ |
| 7 | morning | 7 | 持ち物 | 🎒 | ACT-040 | 1 | 08:05 | 持ち物を確認するように声をかけた | 今日の持ち物を確認した | 今日の持ち物確認の声かけ |
| 8 | morning | 8 | 出発 | 🚪 | ACT-041 | 1 | 08:15 | 出発するように声をかけた | 時間までに出発できた | 出発の声かけ |
| 9 | evening | 1 | 帰宅確認 | 🏠 | ACT-042 | 1 | null | 帰宅後にひと息つくよう声をかけた | 帰ってきてひと息ついた | 帰宅後の声かけ |
| 10 | evening | 2 | 今日の予定 | 📋 | ACT-043 | 1 | null | 今日することを確認するように声をかけた | 今日することを確認した | 予定確認の声かけ |
| 11 | evening | 3 | 宿題 | ✏️ | ACT-015 | 1 | 16:30 | 宿題をするように声をかけた | 宿題をした | 宿題実施の声かけ |
| 12 | evening | 4 | 夕食 | 🍚 | ACT-004 | 3 | 18:00 | ご飯を食べるように声をかけた | ご飯を食べた | 食事の声かけ |
| 13 | evening | 5 | 入浴 | 🛁 | ACT-019 | 1 | 18:30 | お風呂に入るように声をかけた | お風呂に入った | 入浴の声かけ |
| 14 | evening | 6 | 明日の持ち物 | 🎒 | ACT-044 | 1 | null | 明日の持ち物を確認するように声をかけた | 明日の持ち物を確認した | 明日の持ち物確認の声かけ |
| 15 | night | 1 | 19時の振り返り | 🌟 | ACT-027 | 1 | 19:00 | 1日の振り返りに誘った | ママと1日を振り返った | 振り返りの声かけ |
| 16 | night | 2 | 明日の予定 | 🗓️ | ACT-035 | 1 | 19:15 | 明日の時間割を確認するように声をかけた | 明日の時間割を確認した | 時間割確認の声かけ |
| 17 | night | 3 | 明日の準備 | 🎒 | ACT-022 | 1 | 19:30 | 明日の持ち物を用意するように声をかけた | 明日の持ち物を用意した | 持ち物準備の声かけ |
| 18 | night | 4 | 歯磨き | 🪥 | ACT-005 | 2 | 20:30 | 歯をみがくように声をかけた | 歯をみがいた | 歯みがきの声かけ |
| 19 | night | 5 | 服薬 | 💊 | ACT-038 | 2 | 20:40 | 夜の薬を飲むように声をかけた | 薬を飲んだ | 服薬の声かけ |
| 20 | night | 6 | スマホの区切り | 📱 | ACT-020 | 1 | 20:45 | 21時までにスマホ・ゲームを終えるように声をかけた | 21時までにスマホ・ゲームを終えた | ゲーム終了の声かけ |
| 21 | night | 7 | 就寝 | 🛏️ | ACT-025 | 1 | 21:30 | 決めた時間に布団に入るように声をかけた | 決めた時間に布団に入った | 就寝の声かけ |
| 22 | night | 8 | おやすみ | 🌙 | ACT-045 | 1 | 21:45 | おやすみの挨拶をした | おやすみを言った | おやすみの声かけ |

マッピング注記(近似を含む。K2の活動マスタ統合時に見直す):

- 朝食と夕食は同じ ACT-004(docxの上限3=食事3回)を共有する。歯磨きは朝夜で ACT-005(上限2)、
  服薬も朝夜で ACT-038(上限2)を共有する。
- 「宿題」は docx の ACT-015(宿題をした)に対応させた(ACT-034 宿題確認は別活動として K2 で扱う)。
- 「明日の予定」は ACT-035(時間割確認)への近似マッピング。
- 「明日の持ち物」(夕方=確認・新規 ACT-044)と「明日の準備」(夜=用意・docx既存 ACT-022)は
  別活動として分けた。
- **新規発行キーの一覧**: ACT-037 起床 / ACT-038 服薬 / ACT-039 日焼け止め / ACT-040 今日の持ち物確認 /
  ACT-041 出発 / ACT-042 帰宅後のひと息 / ACT-043 今日の予定確認 / ACT-044 明日の持ち物確認 /
  ACT-045 おやすみ。次に発行する場合は ACT-046 から。

> **将来方針(ユーザー指示 2026-07-18)**: ルーチン・声かけ文・時刻などのマスタは、将来ユーザーが
> 設定画面(F-05系・K3)から編集できるようにする。K1はシーダー投入のみだが、この前提で
> 文言・時刻は必ずDBデータとして持つ(コードへのハードコード禁止)。実運用でユーザー編集を導入する際は、
> シーダー再実行がユーザーの編集を上書きしない仕組み(初期投入済みフラグ等)を設計する(K3)。

#### 声かけ文テンプレ(prompt_templates・全22ルーチン×level1〜3)

文言は下表の通り**一字一句そのまま**入れる(Fable作文・FR-M10禁止表現チェック済み)。
level の意味: 1=穏やかな予告・提案 / 2=時刻や見通しを短く / 3=選択肢を減らし、責めずに区切る(基本設計§6)。

| ルーチン | level 1 | level 2 | level 3 |
|---|---|---|---|
| 起床 | おはよう。そろそろ起きる時間だよ | 今から起きると、ゆっくり準備できそうだよ | 今起きるか、あと5分で起きるか、決めよう |
| 朝食 | 朝ごはん、少し食べる？ | 出発まであと30分だよ。何なら食べられそう？ | 今日は一口だけでもOKにしようか |
| 歯磨き(朝) | 歯磨き、今する？ 5分後にする？ | 出発の前に歯磨きしておくと安心だよ | 今日は、今するか帰ってからにするか決めよう |
| 服薬(朝) | お薬の時間だよ | ごはんのあと、お薬も一緒に済ませようか | お薬だけは先に済ませておこうか |
| 着替え | 何時ごろ着替える？ | 出発まであと20分。そろそろ着替えようか | 今着替えるか、5分後にするか決めよう |
| 日焼け止め | 出る前に日焼け止めを塗ろうか | 玄関に置いてあるよ。出る前にひと塗りしよう | 今日は顔だけでもOKにしようか |
| 持ち物 | 持ち物、一緒に確認しようか | 出発まであと10分。カバンの中を見ておこう | 水筒だけ確認したら出発にしよう |
| 出発 | そろそろ出発する時間だよ | 今出ると、いつもの時間に間に合いそうだよ | 準備できたところまでで、出発しよう |
| 帰宅確認 | おかえり。まずは休む？ | おかえり。荷物を置いたら、ひと息つこう | 今日は休んでからでOKだよ |
| 今日の予定 | 今日することを確認しようか | 夕ごはんの前に、今日することを見ておこう | 一つだけ選んで、あとは明日に回そうか |
| 宿題 | 宿題は何時ごろする？ | 夕ごはんまでにやると、あとがゆっくりできるよ | 今日は、やる分だけ決めて区切ろう |
| 夕食 | ごはん、そろそろにする？ | あたたかいうちに食べようか | 食べられる分だけでOKだよ |
| 入浴 | お風呂、今にする？ あとにする？ | 今入ると、寝る前にゆっくりできるよ | 今日は短めでもいいから入っておこうか |
| 明日の持ち物 | 明日いる物を確認しようか | 夕ごはんの前に、明日いる物だけ見ておこう | 一番大事な物だけ、先にカバンに入れよう |
| 19時の振り返り | 今日のことを一緒に確認しよう | 19時になったら、今日の振り返りをしようか | 今日は一つだけ、よかったことを教えて |
| 明日の予定 | 明日は何時間目から行く？ | 明日の時間割、一緒に見ておこうか | 明日のことは、決められるところまででOKだよ |
| 明日の準備 | 明日使う物をカバンに入れようか | 寝る前に準備しておくと、朝がラクだよ | 一番大事な物だけ、今入れておこう |
| 歯磨き(夜) | 歯磨き、今する？ | 寝る前に歯磨きを済ませておこうか | 歯磨きだけしたら、あとは自由時間にしよう |
| 服薬(夜) | 夜のお薬の時間だよ | 寝る前に、お薬を済ませておこうか | お薬だけは先に済ませようか |
| スマホの区切り | 今していること、どこで区切る？ | 21時まであと15分だよ。区切りを決めようか | 今の動画が終わったら、おしまいにしよう |
| 就寝 | そろそろ寝る準備にしようか | 決めた時間に布団に入ると、朝がラクだよ | 電気を暗くするね。布団でゆっくりしよう |
| おやすみ | 今日の声かけはここまで。おやすみ | 今日もおつかれさま。おやすみ | また明日ね。おやすみ |

**禁止表現(FR-M10)**: 次の表現をシード文言・`parent_prompt_label` に含めないこと(テストで担保する。§5)。
「何回言ったら分かるの」「まだできていない」「約束を守って」「ママが困る」「ちゃんとしなさい」
「明日行くって言ったでしょ」「できないと困るよ」

## 4. API(すべて `/api/koekake/` 配下・既存APIには触らない)

- コントローラは `backend/app/Http/Controllers/Api/Koekake/` 配下に分割
  (例: `KoekakeTaskController` / `PromptEventController` / `CompletionController` / `SnoozeController`)。
- 「当日」判定は APP_TIMEZONE(Asia/Tokyo)基準。既存 `task_records.record_date` と同じ流儀。
- 日時のJSONシリアライズは既存APIレスポンスの流儀に合わせる(ISO8601)。
- バリデーションエラーは422、存在しないIDは404。エラーフォーマットは既存コントローラに合わせる。
- **書き込み系はすべてトランザクション+サーバ集計値の返却**(DR-008/DR-010)。フロントは応答値で上書きする。

### 4-1. `GET /api/koekake/tasks?date=YYYY-MM-DD&phase=morning|evening|night`

- `date` 省略時は当日(Asia/Tokyo)。`phase` 省略時は全時間帯を返す。
- **遅延生成**: 指定日の daily_tasks が無いテンプレ(is_active=true)分を生成してから返す。
  `phase` 指定があっても**生成は全phase分**行う(日の途中で部分生成状態を作らない)。
  生成は `unique(task_date, routine_template_id)` を衝突ガードにした upsert/insertOrIgnore
  (並行GETでも安全)。生成時に phase/name/icon をテンプレからコピー、
  `scheduled_at = task_date + default_time`(default_time null なら null)。
- レスポンス(sort はテンプレの `sort_order` 順):

```json
{
  "date": "2026-07-18",
  "tasks": [
    {
      "id": 12,
      "activity_key": "ACT-005",
      "phase": "morning",
      "name": "歯磨き",
      "icon": "🪥",
      "status": "scheduled",
      "scheduled_at": "2026-07-18T07:40:00+09:00",
      "prompt_count": 2,
      "latest_prompt_at": "2026-07-18T08:12:00+09:00",
      "next_remind_at": null,
      "suggested_prompt": { "prompt_template_id": 45, "level": 3, "text": "今日は、今するか帰ってからにするか決めよう" },
      "completion": null
    }
  ]
}
```

- `next_remind_at`: そのタスクの status=scheduled な reminder_schedules の最小 remind_at(無ければnull)。
- `suggested_prompt`: level = min(prompt_count + 1, 3) の prompt_templates から
  `is_preferred desc, sort_order asc` の先頭。該当levelに文が無ければ、それ以下のlevelで最大のものに
  フォールバック。1件も無ければ null。
- `completion`: completion_events があれば `{ "status": "...", "completed_at": "...", "note": null }`。

### 4-2. `GET /api/koekake/tasks/{id}`(M-02 詳細用)

- 4-1のタスク1件分に加えて:
  - `prompts`: 非キャンセルの prompt_events を prompted_at 昇順で
    `[{ "id", "prompted_at", "prompt_text", "source" }]`(表示上の「n回目」は配列順で数える)
  - `prompt_candidates`: level別の全候補
    `[{ "level": 1, "items": [{ "prompt_template_id", "text", "is_preferred" }] }, ...]`
  - `reminders`: status=scheduled の `[{ "id", "remind_at" }]`

### 4-3. `POST /api/koekake/prompt-events`(声かけ済み)

- body: `{ "daily_task_id": 12, "prompt_text": "…", "source": "template|edited|custom", "idempotency_key": "…" }`
  - prompt_text: required・max200 / source: required・3値 / idempotency_key: required・max64
- 処理(トランザクション内・daily_task 行を `lockForUpdate`):
  1. prompt_events を insert(prompted_at=now、prompt_order=非キャンセル件数+1)
  2. キャッシュ再計算: prompt_count=非キャンセル件数、latest_prompt_at=非キャンセルの最新 prompted_at
  - **INSERT は必ずネストした `DB::transaction(fn () => …, 1)`(=DBセーブポイント)で囲む**。
    PostgreSQL では unique 違反で外側トランザクションが abort 状態になり、その後の SELECT も失敗するため、
    セーブポイントで違反だけを吸収してから外側で勝者行を引く。**既存 `TaskRecordService::store()` と
    `recoverFromInsertConflict()` のパターン(SQLState 23505 / "UNIQUE constraint failed" 判定)を踏襲**。
    ローカルの SQLite はこの abort 挙動が無く、本番 PostgreSQL 17 でのみ顕在化する(DR-010 の教訓)。
- 201 レスポンス(**サーバ値が唯一の真実**):

```json
{
  "prompt_event_id": 301,
  "daily_task_id": 12,
  "prompt_count": 3,
  "latest_prompt_at": "2026-07-18T08:20:00+09:00",
  "suggested_prompt": { "prompt_template_id": 45, "level": 3, "text": "…" }
}
```

- **同一 idempotency_key の再送は 200 を返し、新規行を作らない**。返す `prompt_event_id` は初回と同一。
  `prompt_count` / `latest_prompt_at` / `suggested_prompt` は**その時点のサーバ集計値(現在値)**を返す
  (DR-008: サーバ値が唯一の真実。フロントは常にこの値で上書きする)。
  ※初回応答の「スナップショット」を保持して返すのではない。フロントはタスク単位で mutation を直列化し、
  押下ごとに新しい idempotency_key を採番するため(§7-1)、同一キー再送は実質ネットワーク再送のみで、
  その間に同一タスクの別イベントは入らない。よって現在値=初回応答値になるのが通常。
  既存 `TaskRecordService::store()` の冪等パターンを踏襲。
- 二重押下防止は冪等キーのみで行う(「同一秒・同一タスク」判定は実装しない)。

### 4-4. `DELETE /api/koekake/prompt-events/{id}`(取り消し)

- 制約: 対象イベントのタスクの task_date が**当日(Asia/Tokyo)のみ**取消可。過去日は 422。
- 処理(トランザクション): cancelled_at=now を立て(物理削除しない)、キャッシュ再計算。
- 既にキャンセル済みなら 200 で現在値を返す(冪等)。
- 200 レスポンス: `{ "daily_task_id": 12, "prompt_count": 2, "latest_prompt_at": "…" }`
  (10秒Undo はフロント表示の要件。サーバは当日制限のみで簡素化)

### 4-5. `PATCH /api/koekake/tasks/{id}/completion`(行動結果)

- body: `{ "status": "completed|partial|together|parent_done|deferred|unknown", "note": "任意・max200" }`
- 処理(トランザクション):
  1. completion_events を upsert(unique daily_task_id。completed_at は毎回 now で更新)
  2. `daily_tasks.status` に同じ値をミラー(一覧の未完了ソート・表示用キャッシュ。正本は completion_events)
  3. status が `completed | together | parent_done | deferred` のとき、status=scheduled の
     reminder_schedules を cancelled にする(基本設計§9-3「完了時に予定済み通知を解除」。
     partial / unknown は継続中扱いで残す)
- 200 レスポンス: `{ "task_id": 12, "status": "completed", "completion": { "status": "…", "completed_at": "…", "note": null } }`
- 上書き可(押し直しで状態変更)。完了の「削除」は無し(unknown への上書きで代替。将来課題)。

### 4-6. `POST /api/koekake/tasks/{id}/snooze`(再通知)

- body は次の**いずれか一つだけ**(複数指定・ゼロ指定は 422):
  - `{ "minutes": 5 | 10 | 15 }` → remind_at = now + minutes
  - `{ "remind_at": "2026-07-18T20:30:00+09:00" }` → 指定時刻(当日内・未来のみ。それ以外422)
  - `{ "none_today": true }` → 新規作成なし(キャンセルのみ)
- 処理(トランザクション): 既存の status=scheduled をすべて cancelled にしてから、新規1件を作成
  (none_today はキャンセルのみ)。
- 200 レスポンス: `{ "task_id": 12, "next_remind_at": "2026-07-18T20:30:00+09:00" }`(none_today なら null)

### 4-7. ルート定義(`routes/api.php` に追記)

```php
Route::prefix('koekake')->group(function () {
    Route::get('/tasks', [KoekakeTaskController::class, 'index']);
    Route::get('/tasks/{id}', [KoekakeTaskController::class, 'show'])->whereNumber('id');
    Route::post('/prompt-events', [PromptEventController::class, 'store']);
    Route::delete('/prompt-events/{id}', [PromptEventController::class, 'destroy'])->whereNumber('id');
    Route::patch('/tasks/{id}/completion', [CompletionController::class, 'update'])->whereNumber('id');
    Route::post('/tasks/{id}/snooze', [SnoozeController::class, 'store'])->whereNumber('id');
});
```

## 5. バックエンドの完了条件(DR-017: Pest featureテストが完了条件)

`backend/tests/Feature/Api/Koekake/` に Pest featureテストを作成し、**全部緑**であること。最低限:

1. GET tasks: 初回アクセスで当日タスクが遅延生成される(is_activeテンプレ数と一致)。
   2回呼んでも件数が増えない。phase指定でも全phase分生成される。is_active=false は生成されない。
2. GET tasks: suggested_prompt が prompt_count に応じた level を返す(0回→1、1回→2、2回以上→3)。
3. POST prompt-events: 201でイベント作成・prompt_count/latest_prompt_at がサーバ再計算値で返る。
4. POST prompt-events: 同一 idempotency_key の再送が 200・同一内容・行が増えない。
5. DELETE prompt-events: cancelled_at が立ち、prompt_count が再計算される。過去日タスクのイベントは422。
   二重取消は200(冪等)。
6. PATCH completion: upsert(2回叩いても1行のまま更新)。不正status 422。
   completed で scheduled リマインダーが cancelled になる。partial では残る。
7. POST snooze: minutes / remind_at / none_today の3形態。排他バリデーション(複数指定422)。
   既存 scheduled の置き換え(キャンセル)を検証。
8. シーダー: 全 prompt_templates.text と parent_prompt_label に FR-M10 禁止表現7種が含まれないことを
   ループで検証するテスト(文言ガバナンスの自動化)。
9. 既存テストが引き続き緑(`php artisan test` 全体)。

品質確認(実装者がローカルで実行): `php artisan test` / `./vendor/bin/pint --test`
ローカルで `php artisan migrate:fresh --seed` が通ること。

## 6. 本番反映手順(PR1マージ後・ユーザー操作)

main マージ → Laravel Cloud 自動デプロイ後、Commands タブで:

```bash
php artisan migrate --force
php artisan db:seed --class=KoekakeSeeder --force
```

- **fresh は不要**(新規テーブルのみ。計画§4-2)。既存データは無傷。
- その後 Codex に curl スモークを依頼(依頼書は Fable が別途作成。§4のAPI例がベース)。

---

# フロントエンド(PR2)

## 7. 画面実装(`/koekake`・M-01/M-02)

### 7-1. 構成

- ルート: `App.tsx` に `<Route path="koekake" element={<KoekakePage />} />` を追加。
  AppShell のナビに「声かけ」(母向け導線)を追加。
- ファイル: `src/pages/KoekakePage.tsx` + `src/features/koekake/`
  (`queries.ts`(API契約型+fetch)・`components/`・`useKoekakeMutations.ts`)。
  既存画面・既存featureには触らない。
- 通信層は `features/taskRecords/useTaskPersistence.ts` のパターンを参考にする。ただし
  **mutation はタスク単位で直列化**し(同一タスクへの連打で並行POSTしない)、
  **サーバ応答値で state を確定**する(DR-008/DR-010。H1〜3の再発防止を新規実装では最初から)。

### 7-2. M-01 一覧画面

- ヘッダー: 画面名「声かけリマインダー」+日付表示(K1は当日固定でよい。日付切替はK3)。
- `SegmentedTabs` で 朝/夕方/夜。**現在時刻で初期選択**: 4:00〜10:59=朝、11:00〜17:59=夕方、
  18:00〜3:59=夜。
- タスクカード(基本設計§5-1のレイアウト):
  - アイコン・タスク名・声かけ回数(「声かけ 2回」)・最新の声かけ時刻・次回通知時刻(あれば)・
    推奨文(suggested_prompt.text)・完了状態バッジ(completionがあれば)
  - ボタン: **[声かけ済み](主ボタン・最も押しやすく)** [5分後] [詳細]
- 「声かけ済み」押下:
  1. suggested_prompt.text + source='template'(候補が無ければ name を文に、source='custom')で
     POST。idempotency_key はフロントで採番(uuid)。
  2. 押下と同時に +1 フライ演出(B案v3の押し心地)。応答のサーバ値(prompt_count/latest_prompt_at/
     suggested_prompt)でカードを確定更新。
  3. **10秒Undoトースト**(基本設計§7-3)。見た目は控えめにする(DR-018の学び: 取り消し導線は
     目立たせない)。Undo押下で DELETE → 応答値でカード更新。
- [5分後] は snooze(minutes:5)。応答の next_remind_at をカードに反映。
- **期限到来の強調**: 未完了(completionなし)かつ「next_remind_at が過去」または
  「prompt_count=0 かつ scheduled_at が過去」のカードを既存トークン内の色で強調する。
- **回数は評価でなく記録として中立表示**(「就寝 4回」を失敗色・警告色にしない。基本設計§17)。

### 7-3. M-02 詳細(シートで実装。配下ルートは作らない)

- [詳細] でボトムシート(またはモーダル)を開き、`GET /tasks/{id}` を表示:
  - 当日の声かけ履歴(n回目・時刻・使った文)
  - おすすめの言い方: prompt_candidates を level 区切りで表示。
    操作: [この文で声かけ済み] / 文を編集して声かけ済み(source='edited') /
    自由入力で声かけ済み(source='custom')
  - 再通知: [5分後] [10分後] [15分後] [今日はもう通知しない]
  - 行動結果: 6択ボタン [完了] [一部] [一緒に] [代行] [後日] [未確認] → PATCH completion。
    押し直しで変更可。
- シート内の操作結果も一覧カードへサーバ応答値で反映する。

### 7-4. デザイン

- B案v3 準拠。母用は**落ち着いた寒色**(既存トークンから選ぶ。**画面固有カラーコードの新設禁止**)。
- 母用ワイヤーフレーム PNG(`docs/archive/requirements/くらしリレイ_ワイヤーフレーム_母用詳細.png`)を正とする。
  モックは作らずスペック直行(計画§5-4)。
- 娘側画面(既存 `/oshigoto` 等)には声かけ回数を一切出さない(基本設計§15。K1は画面分離で担保)。

## 8. フロントエンドの完了条件(DR-017: vitest で契約検証)

> **テスト方式の確定(2026-07-18・Fable判断)**: DR-017 と当初スペックは「vitest+MSW」と記したが、
> **本プロジェクトの既存テストは MSW を導入しておらず、`vi.fn<typeof fetch>()` による fetch モック方式**
> で契約検証している(`features/oshigoto/OshigotoPersistence.test.tsx`)。koekake も**既存慣習に合わせ
> fetch モック方式**を採用する(バックエンドで Pest→PHPUnit に合わせたのと同じ「既存の枠組みに従う」判断)。
> MSW の新規導入はしない。これは承認済みの逸脱であり、以後 DR-017/AGENTS.md の「vitest+MSW」表記は
> 「vitest(fetch モック)」と読み替える。

`src/features/koekake/` にテストを作成し全緑(参考: `features/oshigoto/OshigotoPersistence.test.tsx`)。最低限:

1. 一覧: GET /api/koekake/tasks のモック応答からカードが描画される(名前・回数・推奨文)。
2. 声かけ済み: POST が契約どおりの body(daily_task_id/prompt_text/source/idempotency_key)で飛び、
   応答の prompt_count/suggested_prompt で表示が更新される(ローカル加算値でなくサーバ値が勝つこと)。
3. 連打: 同一タスクに3連打しても POST が直列に3回(並行しない)・idempotency_key が毎回異なる。
4. Undo: トーストから DELETE が飛び、応答値で回数表示が戻る。
5. 完了: PATCH completion で completion バッジが描画される。
6. snooze: minutes:5 の POST と next_remind_at の表示反映。
7. タブ初期選択: 時刻をモックして 朝/夕方/夜 の初期選択が仕様どおり。

品質確認(実装者がローカルで実行): `npm run lint` / `npm run typecheck` / `npm run test` / `npm run build`
実機確認はリリース前にユーザーが1回(Fableはブラウザを駆動しない)。

### 8-1. K1マージ時点の残課題(バックログ・ユーザー判断 2026-07-18 = 今マージ+後日対応)

Codexフロントレビュー3周で大半の指摘は解消。以下2点のみ低実害のためバックログ化して先にマージ(DR-016)。
実機テストで実害が出たら着手する。

1. **取消後の再取得失敗+即再押下で古い推奨文を1件送る(3次エッジ)**: cancel成功後の一覧invalidateは
   await済みだが、その**再取得GET自体が失敗**すると TanStack Query 既定で失敗を握りつぶして解決するため、
   古いキャッシュの `suggested_prompt` が残り、直後に再押下すると古い level の文を送りうる。
   回数はサーバ正・記録は詳細画面から削除可。**堅牢化案**: cancel の invalidate を `throwOnError: true` に
   するか、再取得失敗時は対象タスクの声かけ操作をブロック継続。GET失敗の回帰テストも追加。
   より根本的には**バックエンドの DELETE 応答に `suggested_prompt` を含める**(POSTと対称化。要BE小改修+再デプロイ)。
2. **Undoタイマー競合テストの穴**: 実装(押下時タイマー停止・DELETE解決まで表示継続・失敗時再試行)は
   正しく解消済みだが、テストが `vi.useFakeTimers()` を**トーストの実タイマー生成後**に開始しているため、
   停止処理が無くても通り得る(テスト品質のみ・コードのバグではない)。fake timers をトースト生成前から
   有効にして検証を厳密化する。

---

# 付録

## 9. docx設計書のK2以降への持ち越し整理(ユーザー確認 2026-07-18 の宿題)

docx設計書のうちK1で採用しなかった提案の整理。**K2設計時にこの表から拾う**。

### 9-1. K1で「箱」として先行確保したもの(実装済み・評価はK2以降)

- `activity_key`(ACT-xxx。§4.1の運用ルール: 変更しない・再利用しない・廃止キーは残す)
- 3ラベル表現: `child_label` / `parent_prompt_label` / `quick_label`
- `daily_limit`(1日上限)・`display_rule`(表示条件)・`is_preferred`

### 9-2. K2以降に持ち越すもの(K1では実装しない)

| docx該当 | 内容 | 行き先の目安 |
|---|---|---|
| §7・§11.3 | 日種別判定エンジン(weekly_schedule / long_break_period / date_override / 派生フラグ) | K2/K3 |
| §9.1・F-01/F-02 | 娘側の活動記録画面・「ほかのできたこと」 | K2(見通し3項目との関係は要設計) |
| §9.3・F-04 | クイック記録画面 | K2以降 |
| §9.5・F-06 | 履歴・振り返り画面 | K3(レポートと統合) |
| §9.4・F-05 | スケジュール設定画面 | K2/K3(**ユーザー編集要望あり 2026-07-18**: ルーチン・文言・時刻を画面から修正可能に) |
| §6.1 | 自立度(自分から/声かけ後/一緒に/手伝いあり) | K2/K3でイベントから導出(列は持たない。§2-5注記) |
| §5 | 未マッピング活動(ACT-001/002/006〜014/016〜018/021/024/026/028〜034/036)のルーチン化 | K2の活動マスタ統合時 |

### 9-3. バッティングのため要ユーザー確認(K2設計時に必ず確認する)

1. **K2娘用ホームのコンセプト**: 計画のD-01(見通し3項目中心)と docx F-01(できたこと記録中心)は
   画面の主役が異なる。K2モック作成前に方向を確認。
2. docx の時間帯区分(朝/帰宅後・夕方/夜/**いつでも**)の「いつでも」の扱い
   (phase は string なので追加自体は可能)。
3. ACT-023 は docx 本文に定義が無い欠番(受入条件に「表示されない」とだけ記載)。廃止キー扱いとし、
   割り当てない。

### 9-4. 決定済み(再確認不要)

- 記録テーブルは prompt_events / completion_events 分離(docxの単一テーブル案は不採用)
- 声かけ文は parent_prompt_label + 回数別 prompt_templates の両方
- docxの `linked_record_id` は不要(daily_task_id で紐づく)
- **娘ポイント制(1回1pt・上限・学習60分=お菓子1個換算)は、既存おしごと報酬
  (task_records の granted_point_value・reward_collections)を拡張して実装する**
  (ユーザー決定 2026-07-18)。別のポイント経済は新設しない。K2設計は既存reward系の拡張案から始める。

## 10. 実装注意(共通)

- ブランチは**必ず最新mainから**。コミット前に `git status -sb` で現在ブランチを実測確認。
- 既存の oshigoto/mamakaji ドメインのコード・テーブル・テストに一切触れない。
- 文言(声かけ文・ラベル)は本書の表から改変せずに使う。追加・変更したくなったら Fable に差し戻す。
- わからない点・本書と実コードの食い違いは、勝手に判断せず質問として返す。
