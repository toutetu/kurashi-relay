# Codex再レビュー報告: task-count-web（修正後最終確認）

レビュー日: 2026-07-17  
対象: `feat/task-count-web` の `ab30b16` と作業ツリーの未コミット修正  
除外: 前回の中1（POST並列・応答逆転）は指示どおり再指摘していない。

## 1. 品質ゲート

`frontend/` で実行した。

| 項目 | 結果 | 詳細 |
|---|---|---|
| `npm.cmd run lint` | 合格 | ESLint、exit code 0 |
| `npm.cmd run typecheck` | 合格 | `tsc -b --pretty false`、exit code 0 |
| `npm.cmd run test` | 合格 | 6 files / 39 tests passed、exit code 0 |
| `npm.cmd run build` | 合格 | 初回で成功。1974 modules transformed、exit code 0 |

build は初回で成功したため再試行していない。`0xC0000409` クラッシュは再現しなかった。
追加確認の `git diff --check` も exit code 0 だった。

## 2. 修正検証

### 重大1: in-flight create の取り消し — 通常成功経路は合格、エラー経路に新規不具合あり

- `decrementTask()` は最新pending createが `inFlightRef` に含まれる場合、操作をキューから消さず、`pendingUndoRef` のタスク別予約数を1増やして楽観的にcount/summaryを1減らす（`useTaskPersistence.ts:385-406`）。
- `applyCreateResult()` は予約を1件消費し、createで得た `record.id` へのcancelをenqueueして即時実行する（同:131-148）。この分岐は早期returnするため、create結果によるsummary反映と `scheduleReward()` は走らない。
- 同一slugの予約が複数でも、成功したcreate結果ごとに予約数を1減らし、1件ずつ補償cancelする構造である。全createが成功する通常経路では予約数とcancel数が対応する。
- 新規テストは、POST保留中に取り消し、POST解決後に `/api/task-records/7` のDELETEが発行され、画面0件・cancel応答のsummary count 0・ゲージ元値へ収束することを確認している（`OshigotoPersistence.test.tsx:265-319`）。

ただし、予約済みcreateが422等の確定エラーになった場合の予約消費漏れがある。詳細は「新規指摘1」。このため重大1の修正全体としては条件付き合格に留まる。

### 重大2: CheerOverlayとトーストの二重取り消し — 合格

- `undoLastIncrement()` が `lastAction` の存在をガードにし、decrement、`lastAction` 消費、CheerOverlay終了、タイマー破棄を一括で行う。
- CheerOverlayとトーストは同じ関数だけを呼ぶため、片方の操作後はもう片方も消え、decrementは1回に限定される。
- `OshigotoPage`（`OshigotoPage.tsx:124-133,249-261,271-291`）と `MamaKajiPage`（`MamaKajiPage.tsx:135-144,255-268,279-299`）の両方へ同じ修正が入っている。
- 新規テストはOverlay側を先に操作し、旧実装なら残るトーストも続けて操作したうえで、DELETEが1回だけであることを確認するため、前回不具合を検出できる内容である（`OshigotoPersistence.test.tsx:321-355`）。MamaKaji側の同一テストはないが、コード差分の突き合わせでは同じガードが成立している。

### 軽微1: `+1` フライのテーマ色 — 不合格（前回指摘が残存）

`.fly` は `color: var(--fly-color, var(--primary))` へ変更されたが（`index.css:603`）、`--fly-color` を設定する箇所がない。ソース全体で `--fly-color` の出現はこの宣言1件だけだった。

`TaskRow` と `KajiTaskRow` は従来どおりTailwindの文字色クラスを付けているだけ（各:41行目）。build後CSSではこれらのutilityより後に `.fly` が出力されるため、同じ詳細度で `.fly` が後勝ちし、fallbackの `--primary` が使われる。おしごとの `--osh-violet`、ママ家事の `--mkj-rasp` にはならない。

ダッシュボードのQuickLogsCardは `--fly-color` を設定せず `.fly` だけを使うため、fallbackの `--primary` となり従来色は維持される。

### 新規テスト2件の妥当性

1. in-flight取り消しテスト: 補償DELETEと画面・summaryの0件収束を確認しており、通常成功経路の回帰テストとして妥当。ただし、複数予約とcreate確定エラーは未検証。
2. 二重取り消し防止テスト: 旧実装ではOverlay操作後も残るトーストを続けて押す構成で、DELETE回数を1件に固定しており妥当。逆順およびMamaKaji側は未検証だが、現コードは共通ハンドラへ一本化されている。

## 3. デグレ確認

| 項目 | 結果 | 確認内容 |
|---|---|---|
| 行UI | 合格 | 行全体button、常に+1、`N件`ピル、Plus、専用マイナスなし、指定ariaを維持 |
| スキーマ | 合格 | `count` / `last_record_id` を使用し、taskの `done` / `record_id` 参照は残っていない |
| `/records` 互換 | 合格 | `RecordTaskRow` は `task.count` を使用。関連テストを含む全テスト合格 |
| 既存テスト | 合格 | 全6 files / 39 testsが合格し、報酬・オフライン再送・母側基本同期も維持 |

## 4. 新規指摘

### 中1: 予約済みcreateの確定エラー後に取り消し予約が残り、次の正常な+1を誤ってcancelする

`pendingUndoRef` を減らすのは成功時の `applyCreateResult()` だけである（`useTaskPersistence.ts:131-138`）。予約済みcreateが422等の非一時エラーになると、`recoverFromDefinitiveError()` はキュー除去とrefetchを行うが、対応する取り消し予約を破棄しない（同:206-214,286-297）。

その後、同じslugをもう一度+1してcreateが成功すると、古い予約を今回のcreateが消費し、その新しいrecordへ意図しないDELETEを発行する。画面も補償cancel後のrefetchで0件へ戻り、ユーザーが新たに記録した1件が消える。

予約をoperation id単位で紐付け、確定エラー時にそのoperationの予約だけ破棄するか、少なくとも確定エラー処理で該当予約を正しく減らす必要がある。次の回帰テストも必要:

1. in-flight createを取り消して予約する。
2. POSTを422で失敗させ、refetchで0件へ戻す。
3. 同じタスクを再度+1してPOSTを成功させる。
4. 新しいrecordへのDELETEがなく、最終1件であることを確認する。

## 5. 総合判定

**修正必要**

4種の品質ゲート、重大2、重大1の通常成功経路、従来合格項目は通っている。しかし、フライ色の前回指摘は実表示上解消されておらず、さらにcreate確定エラー後の古い取り消し予約が次の正常な記録を消す新規不具合がある。両点を修正してから再確認が必要である。
