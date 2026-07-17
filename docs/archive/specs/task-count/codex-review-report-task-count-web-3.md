# Codex最終レビュー報告: task-count-web（3回目）

レビュー日: 2026-07-17  
対象: `feat/task-count-web` の `ab30b16` と作業ツリーの未コミット修正  
確認範囲: 前回報告の残指摘2件と、その回帰テスト・差分ベースのデグレ確認

## 1. 品質ゲート

`frontend/` で実行した。

| 項目 | 結果 | 詳細 |
|---|---|---|
| `npm.cmd run lint` | 合格 | ESLint、exit code 0 |
| `npm.cmd run typecheck` | 合格 | `tsc -b --pretty false`、exit code 0 |
| `npm.cmd run test` | 合格 | 6 files / 41 tests passed、exit code 0 |
| `npm.cmd run build` | 合格 | 初回で成功。1974 modules transformed、exit code 0 |

build は初回で成功したため、`dist` 削除と再試行は行っていない。追加確認の `git diff --check` も exit code 0 だった。

## 2. 残指摘2件の修正検証

### 2-1. `+1` フライのテーマ色: 合格

- `TaskRow` の fly span は `[--fly-color:var(--osh-violet)]` を設定している（`TaskRow.tsx:41`）。
- `KajiTaskRow` は `[--fly-color:var(--mkj-rasp)]` を設定している（`KajiTaskRow.tsx:41`）。両変数は各ページのライト・ダークテーマで定義済みである。
- build後CSSには、上記2つの arbitrary property と `.fly { color: var(--fly-color, var(--primary)) }` の両方が出力された。`color` の宣言位置が後でも、参照されるカスタムプロパティが各span自身に設定されるため、実表示はそれぞれ `--osh-violet` / `--mkj-rasp` になる。
- `QuickLogsCard` は従来どおり `className="fly"` のみで `--fly-color` を設定していない（`QuickCards.tsx:221-224`）。したがって fallback の `--primary` が使われ、従来色を維持する。

### 2-2. 取り消し予約の operation id 化: 合格

- `pendingUndoRef` は `Set<string>` で、slug単位ではなく `getOperationId(operation)` を保持する（`useTaskPersistence.ts:72-73`）。
- `findLatestPendingCreate` は予約済みoperation idを除外して末尾から検索する（`oshigotoStorage.ts:134-153`）。このため同一タスクの複数createでも、各取り消しが別の未予約operationへ割り当たる。
- `decrementTask` は、該当createが in-flight ならそのoperation idを予約し、未送信ならキューから除去する（`useTaskPersistence.ts:383-409`）。
- `applyCreateResult` は、そのoperation idが予約済みの場合だけ予約を消費し、返却された `record.id` への補償cancelを作る。通常の +1 確定反映と報酬演出は早期returnにより実行されない（同:126-143）。
- `recoverFromDefinitiveError` は、失敗したcreate自身のoperation idだけをSetから削除してからキュー除去・refetchを行う（同:201-210）。したがって、422等の確定エラー後に古い予約が残って次の正常な +1 を誤cancelする経路は解消されている。
- 同一タスクのcreate 2件がとも in-flight の場合、1回目の取り消しは最新operation、2回目は予約済みを除外した次のoperationへ予約される。各create成功時に、それぞれの `record.id` への別々の補償DELETEとなる。

## 3. 回帰テスト2件の妥当性

### 確定エラー後の予約破棄: 合格

`OshigotoPersistence.test.tsx:635-695` は、POST保留中の取り消し予約、422確定失敗、GETによる0件収束、同一タスクの再記録を順に再現し、新しいrecordへのDELETEが0件で画面が1件になることを確認している。前回指摘の再現条件を直接覆う内容である。

なお、最終の1件表示は楽観更新でも成立するため、将来テストを強化するなら「2回目POSTの完了を明示的に待ってからDELETE 0件を確認」すると非同期タイミングへの耐性がさらに上がる。ただし現テストでは2回目POSTが即時解決するモックであり、今回の修正判定を妨げる問題ではない。

### in-flight 2件の個別取り消し: 合格

`OshigotoPersistence.test.tsx:697-765` は、2つのPOSTを個別に保留し、それぞれを取り消してからrecord 7 / 8として解決している。DELETEが合計2件で、`/api/task-records/7` と `/api/task-records/8` の両方へ発行されること、および画面0件を確認しており、operation id単位の予約と二重予約防止を適切に検証している。

## 4. 前回合格項目のデグレ確認

| 項目 | 結果 | 確認内容 |
|---|---|---|
| 行UI | 合格 | 今回差分はfly spanのカスタムプロパティ追加のみ。行全体button、常時+1、`N件`ピル、丸Plus、専用マイナスなしを維持 |
| スキーマ | 合格 | `count` / `last_record_id` 契約を維持し、今回差分にスキーマ変更なし |
| `/records` 互換 | 合格 | 今回差分にrecords実装変更なし。関連テストを含む全41テストが合格 |
| 既存の取り消し・報酬・オフライン系 | 合格 | 既存39テストに今回の2件を加えた全41テストが合格 |

前回スコープ外とされたPOST並列・応答逆転は、指示どおり今回の判定対象および新規指摘から除外した。

## 5. 新規指摘

**ブロッキングな新規指摘なし。**

回帰テスト1件には上記の非同期待機を明示する強化余地があるが、実装の不具合ではなく、現テストも今回の即時解決モック下では対象経路を通っているため修正必須とはしない。

## 6. 総合判定

**マージ可**

品質ゲート4種はすべて合格した。前回残っていたフライ色はbuild後CSSを含めて各テーマ色へ解決し、QuickLogsCardのfallbackも維持されている。取り消し予約はoperation id単位となり、確定エラー後の予約残留と、in-flight 2件を個別に補償DELETEできない問題の双方が実装・回帰テストで解消されている。
