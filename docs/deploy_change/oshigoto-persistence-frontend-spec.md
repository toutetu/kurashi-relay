# くらしのおしごと/ママの家事手帖 永続化フロントエンド 実装スペック(Phase 5)

対象: `frontend/` のみ。**backend/ には一切触れない。**
親指示書: `docs/deploy_change/kurashi-relay_laravel-cloud_deployment_instructions.md`(§7 Phase 5 に相当)
前提バックエンド仕様: `docs/deploy_change/oshigoto-persistence-backend-spec.md`(Phase 3-4・**実装済み/本番試験済み**)
本番API試験結果: `docs/deploy_change/phase6-results.md`(全項目合格)
最初に `AGENTS.md` を読むこと。

## 0. 作業手順の厳守事項

1. **ブランチ `feature/oshigoto-persistence-frontend` を切って作業する**(`main`・`docs/*` へ直接コミットしない。開始時に `git switch -c feature/oshigoto-persistence-frontend`)。
2. 論理単位ごとにConventional Commitsでコミットする(例 `feat(frontend): add tasks/rewards api client`)。**pushはしない**(Fableが確認後に行う)。
3. **backend/・既存のダッシュボード/スケジュール機能・共通UIの見た目と演出を変更しない**。CSS(`oshigoto.css` / `mamakaji.css`)・アニメーション・応援オーバーレイの見た目は現状維持。
4. **API URLをソースへ直書きしない**。接続先は既存の `frontend/src/api/client.ts`(`VITE_API_BASE_URL`)経由に統一する。本番URL・`.env` をコミットしない。
5. **新規npmパッケージを追加しない**。冪等キーは `crypto.randomUUID()` を使う(jsdom/Node24で利用可)。データ取得は既存採用の `@tanstack/react-query`、検証は `zod` を使う。
6. 通信失敗時にユーザー操作(タスク完了/取消)を失わせない。楽観的更新の失敗時挙動を明示する(§6・§7)。
7. 完了時に本ファイル末尾(§14)の報告フォーマットで報告する。

## 1. 背景と目的

「くらしのおしごと」(娘=`child`)と「ママの家事手帖」(母=`mother`)は現在、モック定数(`INITIAL_TASKS` / `INITIAL_KAJI` / `INITIAL_JAR` / `INITIAL_COINS` / `INITIAL_POINTS`)+ `useState` のみで動いており、**ページ更新で状態が初期化される**。Phase 3-4 で永続化APIとDBが完成し、本番(Laravel Cloud/Postgres)で全試験合格済み。本フェーズでこのAPIへ接続し、**記録が消えないようにする**。

親指示書 §7 Phase 5 の基本方針:

- 初回表示時にAPIから当日の状態を取得
- 操作時は画面へ即時反映(楽観的更新)
- 同時にAPIへ保存
- API失敗時は `localStorage` へ未同期記録を退避
- 次回起動または通信復旧時に再送
- `idempotency_key` で二重登録を防止
- 同期状態を**利用者を責める表現で表示しない**

## 2. スコープ

### 今回接続する画面(必須)

| 画面 | ファイル | member | 接続内容 |
|---|---|---|---|
| くらしのおしごと(娘) | `frontend/src/pages/OshigotoPage.tsx` | `child` | 当日タスクの完了/取消 → 永続化。ゲージ・コイン・ゾンビリビールをAPI由来に。 |
| ママの家事手帖(母) | `frontend/src/pages/MamaKajiPage.tsx` + `frontend/src/features/mamakaji/context/MamaKajiContext.tsx` | `mother` | 当日家事の完了/取消 → 永続化。ゲージ・ポイント・お菓子リビールをAPI由来に。 |

### 今回は接続しない(モックのまま据え置き=変更しない)

- 図鑑(`OshigotoZukanPage` / `MamaKajiZukanPage`)、USJのりもの(`OshigotoUsjPage`)、グッズ交換(コイン消費)。
  これらは backend の対象外(`GET /api/rewards/collections` は存在するが、図鑑の「集めた/未収集」表示の切替=獲得済みが空から始まる挙動変更を伴うため、Phase 5b として別途)。
- ダッシュボード/スケジュール(`features/dashboard` `features/schedule`)。

> **注**: POST時にサーバ側で `reward_collections` は自動的に貯まる(§8)。図鑑への反映は後続フェーズでも、コレクション自体は今フェーズの操作から蓄積される。

## 3. サーバを唯一の真実にする(モデル対応表)

現行モックとサーバモデルは**ゲージの数え方が違う**。ここを取り違えると二重加算・ゲージ不整合になるので厳守。

| 概念 | 現行モック | 本フェーズ(サーバ由来) |
|---|---|---|
| ゲージ表示値 | `count = INITIAL_JAR(6) + 今日の完了数`、満タン(10)でリビール後 `-10` | `summary.gauge_count`(= `lifetime_count % 10`、0〜9)。**クライアントで加減算しない** |
| 累積 | なし | `summary.lifetime_count`(全期間累積・毎日リセットしない=要件と一致) |
| 満タン到達回数 | ローカルで10到達を検知 | `summary.full_count`。到達契機は **POSTレスポンスの `revealed_reward`**(サーバが節目判定) |
| コイン(娘) | `INITIAL_COINS(400)` を `useState` | `summary.coins`(母は `null`) |
| ポイント(母) | `INITIAL_POINTS(190)` を Context で加算 | `summary.points`(娘は `null`) |
| 今日の完了 | `task.done`(ローカル) | `GET /api/tasks` の各タスク `done` / `record_id`(指定日=当日の有効レコード有無) |
| 報酬アイテム | `pickRandomZombie()` / `pickRandomSweet()` をローカル抽選 | `revealed_reward.item_slug` をサーバが決定 → ローカルの `ZOMBIES`/`SWEETS` から同 `id` を引いて表示(§8) |

**帰結**: `INITIAL_JAR` / `INITIAL_COINS` / `INITIAL_POINTS` はライブ表示から外す(定数・図鑑用途は残してよいが、当日ページのゲージ/コイン/ポイントの初期値には使わない)。初回ロード完了までのプレースホルダは §7 のキャッシュ or スケルトンで扱う。member と役割の対応は `child`=おしごと(あきちゃん)、`mother`=家事手帖(ともこ)。

## 4. APIクライアント層(既存 `api/dashboard.ts` の作法に合わせる)

`GET /api/dashboard` と同じ三層(api module → zod schema → react-query hook)で追加する。

### 4.1 zod スキーマ `frontend/src/api/schemas/oshigotoSchema.ts`(新規)

backend §5 の契約に一致させる。少なくとも次を定義:

- `summarySchema`: `{ member, date, today_done_count, lifetime_count, gauge_count, gauge_size, full_count, coins: number|null, points: number|null, collections_count }`
- `taskSchema`: `{ slug, title, category: string|null, point_value, sort_order, done: boolean, record_id: number|null }`
- `tasksResponseSchema`: `{ status, data: { date, member, tasks: taskSchema[], summary: summarySchema }, meta }`
- `revealedRewardSchema`(nullable): `{ type: "zombie"|"sweet", item_slug, milestone_number, obtained_on }`
- `taskRecordResponseSchema`: `{ status, data: { record: { id, member, task, record_date, completed_at, cancelled_at }, summary, revealed_reward: revealedRewardSchema|null }, meta: { timezone, deduplicated } }`
- `rewardsSummaryResponseSchema` / `collectionsResponseSchema`(§5.4/§5.5)

`safeParse` 失敗時は `dashboard.ts` と同様に `ApiError("…データ形式が正しくありません。", 200)` を投げる。

### 4.2 api module `frontend/src/api/oshigoto.ts`(新規)

`client.ts` の `apiGet` を使い、POST/DELETE用に **`apiSend`(または `apiPost`/`apiDelete`)を `client.ts` に追加**する(既存 `apiGet` は変更せず追記のみ)。エラー整形は `apiGet` と同一(ネットワーク断は `ApiError(status:0)`、非2xxは payload の `message`/`errors` を利用)。

関数例:

- `getTasks(member, date?, signal?) → { date, tasks, summary }`
- `getRewardsSummary(member, signal?) → summary`
- `createTaskRecord({ member, task, date?, idempotency_key, source: "web" }) → { record, summary, revealed_reward, deduplicated }`
- `cancelTaskRecord(recordId) → { record, summary }`

`date` は原則**省略**し、サーバのJST当日判定に委ねる(§10)。レスポンスの `data.date` を保持してlocalStorageキーに使う。

### 4.3 react-query hooks `frontend/src/features/oshigoto/queries/` `frontend/src/features/mamakaji/queries/`(新規)

- `useTasksQuery(member)`: `queryKey: ["tasks", member]`、`queryFn` は `getTasks`。`staleTime: 30_000`。
- `useCreateTaskRecord(member)` / `useCancelTaskRecord(member)`: `useMutation`。**楽観的更新は §6**。`onSettled` で `invalidateQueries(["tasks", member])`。ただしオフライン時はinvalidateで上書きせず、キューを真とする(§7)。

## 5. 画面の接続

### 5.1 OshigotoPage.tsx(娘)

- `useState(INITIAL_TASKS…)` を廃し、`useTasksQuery("child")` の結果からタスク行を描く。各行 `done` は `task.done`、`record_id` を保持。
- ゲージ `count` = `summary.gauge_count`(0〜9)。ただしリビール演出のため、完了直後は**楽観的に +1** して満タン(=`gauge_size`)まで見せてよい(§6)。**`-STAMP_SIZE` の減算処理は削除**(サーバが折り返し済み)。
- `handleToggleTask`:
  - `done: false → true`: 楽観的に `done=true`・ゲージ+1 → `useCreateTaskRecord`。新規 `idempotency_key = crypto.randomUUID()` を生成し、そのタスクの当該操作に紐付けて保持(§7)。
  - `done: true → false`: 楽観的に `done=false`・ゲージ-1 → `useCancelTaskRecord(record_id)`。`record_id` が未確定(作成POST未完了)の場合は §7 のキューで「作成の取消(キュー除去)」として扱う。
- リビール: **POSTレスポンスの `revealed_reward` が非nullのときだけ**、既存の800ms着地演出のあと `ZombieRevealModal` を表示。表示アイテムは §8。ローカル抽選 `pickRandomZombie()` は使わない。
- リビールを閉じたら `revealed=null` に戻すだけ(ゲージ減算しない)。`collectedZombies` はUI内の一時表示用途に留め、正はサーバ(コレクションは後続フェーズで図鑑へ)。
- コイン表示が画面内にあれば `summary.coins` を使う(`INITIAL_COINS` は使わない)。

### 5.2 MamaKajiPage.tsx + MamaKajiContext.tsx(母)

- `MamaKajiContext` を **API由来へ改修**: `points` は `useTasksQuery("mother")`(または `useRewardsSummaryQuery("mother")`)の `summary.points` から供給。`collectSweet` によるローカル加算(`+POINT_PER_STAMP`)は廃止(ポイントはサーバが記録加算)。`collectedSweetIds` の初期全収集(`INITIAL_COLLECTED_IDS`)はライブ表示から外す(図鑑は後続フェーズ)。Contextは「サーバsummaryの供給役」に役割変更。
- `MamaKajiPage` のタスク/ゲージ/リビールは §5.1 と同型(`mother`、`SweetRevealModal`、`pickRandomSweet` を使わずサーバ `item_slug`)。
- ポイントチップ(`PointsChip`)は `summary.points` を表示。

## 6. 楽観的更新とロールバック

1. トグル時、**まず画面へ即時反映**(`done` とゲージのローカル楽観値)。
2. mutation発火。**成功時**: レスポンスの `summary` でゲージ/コイン/ポイント/`record_id` を確定値に同期(楽観値を上書き)。`deduplicated:true`(既に同記録あり)でも成功として扱い、二重加算しない。
3. **失敗時(ネットワーク断=`ApiError.status===0`、または5xx)**: 楽観的なUI状態は**保持したまま**、操作を localStorage キューへ退避(§7)し、同期ステータスを「あとで保存します」にする(§9)。**ロールバックして操作を消さない**(利用者の入力を失わせない原則)。
4. **失敗時(422/409 などの確定エラー)**: これは通信ではなくデータ不整合。稀だが、楽観値を**サーバ状態へ戻し**(`getTasks` 再取得)、責めない中立表現(例「うまく保存できませんでした。もう一度試してね」)を出す。409(キー衝突でpayload不一致)は基本発生しない設計だが、発生時は再取得で復旧。

## 7. オフライン退避(localStorage)と再送

`localStorage` は**本番DBの代替ではなく、通信障害時の一時退避**。

### 7.1 保存対象(親指示書 §Phase5「暫定ローカル保存対象」)

- 未同期操作キュー(create/cancel)
- 直近の当日タスク状態・ゲージ/コイン/ポイント(初回描画の即時プレースホルダ用キャッシュ)
- 獲得演出済みの `milestone_number`(リビール二重表示防止・§8)
- 最終同期日時

### 7.2 キー設計(member×日付で分離。例)

- `kurashi:v1:{member}:{yyyy-mm-dd}:snapshot` … 最後に取得した `{ tasks, summary }`
- `kurashi:v1:{member}:queue` … 未同期操作の配列
- `kurashi:v1:{member}:revealed` … 演出済み `milestone_number` の配列

### 7.3 キュー要素

```ts
type PendingOp =
  | { kind: "create"; member: "child"|"mother"; task: string; date: string; idempotencyKey: string; createdAt: string }
  | { kind: "cancel"; member: "child"|"mother"; recordId: number; createdAt: string };
```

- **create**: `idempotencyKey` は**生成時に固定**し、再送で必ず同じキーを送る(サーバ側で二重登録防止=phase6試験#3,#4で実証済み)。
- **create の取消(record_id未確定)**: キュー内の同一 create を除去(まだサーバに無いので何もしない)。既にサーバに作られていれば `cancel` を積む。
- **cancel**: `DELETE /api/task-records/{id}` はサーバ側冪等(取消済みでも200)。取消後に古いcreateキーを再送しても完了は復活しない(phase6試験#8で実証済み)ので、キューの順序どおり流してよい。

### 7.4 再送トリガ

- アプリ起動時(初回マウント)
- `window` の `online` イベント
- 各mutation成功直後(まとめて掃ける)

再送は逐次(順序保持)。全て成功したらキューを空にし、同期ステータスを「保存できました」に(数秒で自然消滅)。

## 8. 報酬リビール(サーバ権威 + 二重表示防止)

- POST(または再送)レスポンスに `revealed_reward`(非null)が含まれるときのみリビールを起動。
- `item_slug` から表示アイテムを解決:
  - child: `ZOMBIES.find(z => z.id === item_slug)`(id: pierrot/exec/prisoner/testsub/doll/vampire/demon)
  - mother: `SWEETS.find(s => s.id === item_slug)`(id: lamington/macaron/pannacotta/mooncake)
  - 見つからない場合(カタログ差異)は演出だけ出す安全なフォールバック(絵文字🎁+汎用名)にし、クラッシュさせない。
- **二重表示防止**: `revealed_reward.milestone_number` が `revealed` キャッシュ(§7.2)に既にあれば表示しない。表示したら追加保存。冪等キー再送では同じ `revealed_reward` が返る(phase6試験#4想定)ため、milestoneで確実に一意化する。
- 既存の演出タイミング(着地800ms→モーダル)とCSSは維持。

## 9. 同期ステータス表示(責めない表現・親指示書 §Phase5「推奨表示」)

- 正常保存: 原則表示なし。
- 同期中: 小さく「保存中…」(控えめ)。
- オフライン/失敗: 「あとで保存します」。
- 復旧・再送成功: 「保存できました」(数秒で消える)。

「失敗しました」「入力が無効です」等、利用者を責める強い表現は使わない。表示位置はヘッダ付近の目立たない小さなチップを想定(既存デザインの世界観・余白を壊さない)。実装はページ内の軽量な状態でよく、大掛かりなトースト基盤は導入しない。

## 10. 日付・タイムゾーン

- `date` は原則**リクエストで省略**し、サーバのJST(`Asia/Tokyo`)当日判定に委ねる(クライアントのTZ差異バグを避ける)。
- localStorageのキー用日付は**レスポンスの `data.date`** を使う(クライアントで `new Date()` から算出しない)。
- 日をまたいだ場合、`useTasksQuery` の再取得で当日が切り替わる。当日キャッシュキーが変わるため前日のキューは前日キーのまま順次再送される。

## 11. テスト(vitest + testing-library。既存 `App.test.tsx` の作法に合わせる)

`vi.stubGlobal("fetch", fetchMock)` で `fetch` をモックし、`Response` を返す方式(既存と同一)。最低限:

1. 初回ロード: `GET /api/tasks?member=child` の結果でタスク行・ゲージ(`gauge_count`)が描画される。`INITIAL_JAR`/`INITIAL_COINS` に依存しない。
2. 完了トグル: 楽観的に `done=true`・ゲージ+1 → POST が正しいbody(`member/task/idempotency_key/source`)で呼ばれ、レスポンス `summary` で確定同期。
3. 冪等: 同一操作の連打・再送で POST body の `idempotency_key` が同一で、二重加算されない(ゲージが1しか増えない)。
4. 取消: `done=true→false` で `DELETE /api/task-records/{record_id}` が呼ばれ、`summary` 減算が反映。
5. リビール: レスポンス `revealed_reward.item_slug="vampire"` で `ZombieRevealModal` に吸血鬼が出る。同 `milestone_number` の再送では**二度出ない**。
6. オフライン: POSTが `status:0`(ネットワーク断)で失敗 → 楽観的UIは保持・キューに退避・「あとで保存します」表示。`online` 復帰で再送され「保存できました」。
7. スキーマ不一致レスポンスで `ApiError`(データ形式)になり、画面がクラッシュしない。
8. 既存テスト(ダッシュボード/スケジュール/共通UI)が全て緑のまま。

## 12. 品質確認(全て通してから完了報告)

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

backend側のコマンドは実行不要(触っていないことが前提)。

## 13. 要確認・設計上の判断

### Fable/ユーザーへ確認(実装をブロックしない・報告に明記)

1. **初期値の持ち越し**: モックの `INITIAL_JAR=6` / `INITIAL_COINS=400` / `INITIAL_POINTS=190` / 図鑑全収集は**デモ用の見せかけ値**で、これまで永続化されていない=本当の累積は存在しない。本フェーズ接続後、実DBは **ゲージ0・コイン0・ポイント0・図鑑空** から始まる。家族の実利用で「今までの分」を持たせたい場合は、`reward_adjustments`(kind=gauge/coin/point)へ**ユーザー確認後の実値を別途投入**する運用(backend §7、Phase 7相当)。→ 見せかけ値のリセットを許容するか、投入するかはユーザー判断。
2. **図鑑/のりもの/グッズ**: 今フェーズ対象外(§2)。図鑑をAPIコレクションに接続すると「獲得済みが空から始まる」ため、1と併せて別フェーズで扱う。

### 実装者が守る設計判断(既に確定)

- ゲージ/ポイント/コインは**サーバsummaryが唯一の真実**。クライアントで加減算しない(§3)。
- 報酬アイテムは**サーバの `item_slug`**。ローカル抽選しない(§8)。
- localStorageは**オフライン退避**であって真実ではない。冪等キー固定で二重登録を防ぐ(§7)。

## 14. 完了報告フォーマット

```markdown
## 実施した作業
## 変更したファイル
## テスト結果(lint / typecheck / test / build)
## 未完了・要確認(§13の1,2 を含む)
## 設計上の判断(あれば)
```

---

## 付録: 実装後のレビュー体制(Fable運用メモ)

- 本スペックの**難所**(ゲージ折り返しの整合・楽観的更新のロールバック・オフラインキューの冪等再送・リビール二重防止)は、Cursor実装後に **Codex上位レビュー**へ回す(親指示書 §6.3「同期・重複登録・再送設計レビュー」)。
- Fableは `git diff --stat` + 要所差分レビュー → ローカルプレビュー実機検証(初回ロード/トグル/更新後復元/オフライン→復旧)→ `docs/design-decisions.md` 更新確認。
