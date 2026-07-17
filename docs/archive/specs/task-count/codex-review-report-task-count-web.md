# Codexレビュー報告: task-count-web（カウントUI化）

レビュー日: 2026-07-17  
対象: `feat/task-count-web` の `main` 差分（`ab30b16` + 作業ツリーの未コミットUI差分）

## 1. 品質ゲート

`frontend/` で実行した。PowerShell の実行ポリシーが `npm.ps1` を拒否したため、同じ npm スクリプトを `npm.cmd` 経由で実行した。

| 項目 | 結果 | 詳細 |
|---|---|---|
| `npm.cmd run lint` | 合格 | ESLint、exit code 0 |
| `npm.cmd run typecheck` | 合格 | `tsc -b --pretty false`、exit code 0 |
| `npm.cmd run test` | 合格 | 6 files / 37 tests passed、exit code 0 |
| `npm.cmd run build` | 合格 | 初回で成功。`tsc -b && vite build`、1974 modules transformed、exit code 0 |

build は初回で成功したため再試行していない。事前報告の `0xC0000409` クラッシュは再現せず、エラー出力・スタックトレース・落ちたモジュールはない。

## 2. スペック適合

### 行UI: 合格

- 行全体が1つの `<button>` で、タップは常に `incrementTask` を呼ぶ。
- 左からタスク名、「N件」ピル、丸い `Plus` アイコンの順になっている。
- ピルは `key={count}` と `count-bump` を使用し、0件と1件以上で配色を分けている。
- タップごとの `+1` フライアニメがある。
- 行内の「−」ボタンはない。
- `aria-label="（タスク名）を記録。きょうN件"` を使用し、`aria-pressed` はない。

対象: `TaskRow.tsx:18-46`、`KajiTaskRow.tsx:18-46`

### 取り消しトースト: UI要件は合格、動作要件は不合格

- おしごと・ママ家事の両ページに、指定文言、`role="status"`、`aria-live="polite"`、`Undo2` 付き「取り消す」ボタンがある。
- 5秒自動消去、連打時のタイマーリセット、アンマウント時のタイマー破棄は実装され、テストも通過している。
- ただし、送信中createの取り消しと、CheerOverlayとの二重取り消しに不具合がある。詳細は重大指摘1・2を参照。

### 色: 一部不合格

- タスク行・ピル・丸いPlusは、おしごとが `--osh-*`、ママ家事が `--mkj-*` を使っている。
- ただし両行で使う `.fly` は `frontend/src/index.css:597-605` の `color: var(--primary)` が、コンポーネント側のテーマ色utilityより後に同じ詳細度で適用される。build後CSSでも `.fly` が後に出力されるため、`+1` フライはダッシュボード系 `--primary` 色になる。詳細は軽微指摘1を参照。

### スキーマ: 合格

- `taskSchema` は `count` / `last_record_id` を持ち、`done` / `record_id` は削除されている（`oshigotoSchema.ts:18-26`）。
- 対象範囲内にタスクの旧フィールド参照は残っていない。`Ride.done` は別機能のため対象外。

### `/records` 画面: 合格

- `RecordTaskRow` は `task.count` を参照している。
- `RecordsPage.test.tsx` も新スキーマへ更新され、記録画面を含む全テストが通過した。

## 3. 指摘事項

### 重大1: 送信中のcreateを「未送信」として除去するため、トースト取り消し後もサーバには1件残る

`incrementTask` は操作をenqueueした直後に `runCreate(operation)` を呼び、POSTを開始する（`useTaskPersistence.ts:315-343`）。一方、POST完了までは操作がキューに残るため、直後の `decrementTask` はその**送信中**操作を `findLatestPendingCreate` で「未送信」と判定し、キューから除去してAPI cancelを行わない（同:357-374）。

その後POSTが成功すると `applyCreateResult` がサーバsummaryと `last_record_id` を適用するが、楽観的に0へ戻したtask countは1へ戻さず、cancelも積まない（同:122-145）。結果は次のようになる。

- 画面のピル: 0件
- サーバ: 有効レコード1件
- snapshot: task count 0のまま「同期済み」扱いになり得る

これは通常の「+1直後にトーストで取り消す」操作でも、POST応答よりクリックが早ければ発生する。

既存テスト `OshigotoPersistence.test.tsx:265-306` は、POSTをすでに開始した状態を「未送信pending」として扱い、DELETEがないことだけを確認している。POST解決後の件数・補償cancel・refetch収束を検証しないため、この不整合を検出できていない。

修正時は少なくとも「まだ送信していないcreate」と「in-flight create」を区別する必要がある。in-flightを取り消す場合は、create確定後にそのrecord idをcancelする補償処理、または単一の直列queue runner上でcreate→cancelを順序どおり処理し、最終refetchでサーバ値へ収束させること。

### 重大2: CheerOverlayとトーストの「取り消す」を両方押すと、1回の+1に対して2回decrementできる

両ページで、CheerOverlayの `onUndo` は `handleDecrementTask` を呼ぶだけで、トーストの `lastAction` とタイマーを消費しない（`OshigotoPage.tsx:124-136,252-264`、`MamaKajiPage.tsx:135-147,258-271`）。逆にトーストの `handleUndo` もCheerOverlayを閉じず、共通の「この追加は取り消し済み」ガードがない。

そのため、追加前から同タスクが1件以上あった場合、2つの導線を順番に押すと2件減る。取り消し対象を1回だけ消費する共通ハンドラまたはrefガードを設け、片方で取り消した時点でもう片方も閉じる必要がある。

この併存ケースのテストはない。

### 中1: 通常オンライン時の連打がmember単位の直列キューを通らず、応答逆転で確定値が古くなる

各タップが `enqueueOperation` 後に個別の `runCreate` を即時起動するため（`useTaskPersistence.ts:315-343`）、オンライン連打のPOSTは並列になる。`flushQueue` 自体は先頭から直列処理するが、通常経路では使用されていない。

後のPOST応答が先に返ったあと、古いPOST応答が遅れて返ると、`applyCreateResult` が新しい `summary` と `last_record_id` を古い値で上書きできる（同:122-143）。記録自体は冪等キーが別なのでサーバに残るが、画面・snapshotのsummaryが後退し、次の取り消し対象も古いrecord idになり得る。復帰処理中に新しいタップをした場合も同様に、flush中操作と通常操作が並列になる。

スペック記載の「member単位で直列処理」に合わせ、送信経路を単一queue runnerへ寄せるか、少なくとも応答の世代管理と確定後refetchを行う必要がある。

テスト `OshigotoPersistence.test.tsx:196-226` はPOST数と冪等キーの一意性のみを確認し、同時実行数、処理順、応答逆転後のsummary / `last_record_id` を検証していない。

### 軽微1: `+1` フライの色が画面テーマではなく `--primary` になる

`TaskRow.tsx:41` と `KajiTaskRow.tsx:41` はそれぞれテーマ色utilityを指定しているが、共通 `.fly` の `color: var(--primary)`（`frontend/src/index.css:603`）が後勝ちする。おしごとでは `--osh-*`、ママ家事では `--mkj-*` が実際の表示色になるよう、`.fly` の固定colorを除くか、テーマ別クラス/変数で上書きすること。

## 4. テスト妥当性

以下は確認できている。

- 3回タップで3 POST、冪等キー3個、ピル3件
- 保存済みrecordへのトースト取り消しでDELETEとcount減算
- `+1` でトースト表示
- 5秒消去と連打時のタイマーリセット
- 報酬演出、オフライン再送、ママ家事の基本同期

一方、マージ前に次を追加・修正する必要がある。

1. POST in-flight中に取り消し、POST解決後もサーバ・画面が0件へ収束すること
2. CheerOverlayとトーストを両方操作してもdecrement / DELETEが1回だけであること
3. 3 POSTの応答を逆順に解決してもsummaryと `last_record_id` が最新になること
4. オフライン復帰中の追加操作を含め、queue順序と二重送信がないこと

## 5. 総合判定

**修正必要**

lint / typecheck / test / build はすべて合格し、buildクラッシュも再現しなかった。行UI、トースト外観、スキーマ、`/records` 互換も概ね仕様どおりである。

ただし、主要操作である「直前の1件を取り消す」が通信タイミングによってサーバへ反映されず、さらに2つの取り消し導線から2件減算できる。記録件数の正しさに直接影響するため、現状はマージ不可と判断する。
