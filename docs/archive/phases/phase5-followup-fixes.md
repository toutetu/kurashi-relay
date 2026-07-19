# Phase 5 フォローアップ修正メモ(並行系の既知不具合バックログ)

作成: 2026-07-17

> **2026-07-17 追記(task-count 反映後の再トリアージ必要)**: 完了記録がトグル→カウント方式へ
> 変わり(DR-015、PR #9/#11)、対象コード(`useTaskPersistence.ts` ほか)が大きく書き換わった。
> 下記 H1〜3 / M1〜3 は**トグル時代の記述**のため、カウント実装に対して再トリアージすること。
> なお H1 の一部(送信中 create の取り消し)は operation id 予約+補償cancelで解消済み。
> **新規追加**: task-count Codexレビューの中1 —— オンライン連打時に各+1のPOSTが並列発火し
> (通常経路は `flushQueue` を通らない)、応答逆転で summary / last_record_id が古い値で
> 上書きされうる(`codex-review-report-task-count-web.md` §中1)。根治は下記「共通の根治策」
> (member 単位の直列 operation processor + 世代管理 + drain後の確定GET)に含めて行う。
状況: **Phase 5(React永続化)をまず本番投入する判断**(ユーザー 2026-07-17)。
下記は Codex レビューで判明した既知の不具合。単発・順番どおりの操作は正しく動く一方、
**並行操作・通信断まわり**に穴がある。家族少人数のため当面の実害は限定的だが、
**Phase 7 の本番フロント切替の前後で潰しておくのが望ましい**(子どもの連打・モバイルの電波不安定で顕在化しうる)。

- 全文レポート: `docs/archive/reviews/codex-review-report-03.md`
- 対象コード: `frontend/src/features/taskRecords/*`, `frontend/src/api/oshigotoStorage.ts` ほか
- 変更しない前提: backend / 見た目・演出 / 図鑑・USJ・グッズ(Phase 5b)

---

## 優先度: 高(重大3件)— まとめて1つの設計で直すのが筋

**共通の根治策**: **member 単位の単一 operation processor** を置き、HTTP送信を永続キューの順番どおり
**1件ずつ直列化**する。タスクごとに「最終 intent(ON/OFF)」を revision / tombstone で保持し、
**古い応答は現在の intent に反しては適用しない**。**キューを掃き切った後に一度だけ authoritative GET** して
summary / snapshot を確定する。下記1〜3はこの1設計でまとめて解消できる。

### H1. 応答喪失時の「ON→取消」で完了が復活する
- **症状**: POSTがサーバに届いて record 作成済みなのに応答だけ失われた(`status=0`)状態で取り消すと、
  未確定 create をキューから消すだけで終わり、その record を DELETE できず、次回 GET で ON に復活する。
- **該当**: `useTaskPersistence.ts`(create実行/`record_id===null`の取消経路)、`oshigotoStorage.ts`(`findPendingCreate`/`removeOperation`)
- **根治**: `record_id` 未確定の取消は「作成して直ちに取消」の tombstone を保持し、同じ冪等キーで再送→
  解決した record ID を即 DELETE。初回POST未到達でも最終状態を安全に OFF へ収束させる。

### H2. 並行 mutation の順序未保証(最後の操作と逆で確定しうる)
- **症状**: トグルごとに個別HTTPを即発火し順序を保証しないため、(a) OFF→ON と素早く操作すると
  後着の DELETE が直後の ON を打ち消し OFF 確定、(b) 2タスク連続で新旧 summary の応答逆転により
  ゲージ/ポイント/コインが巻き戻る(`result.summary` 丸ごと代入 + `refetchType:"none"` で自己回復しない)。
- **該当**: `useTaskPersistence.ts`(`runCreate`/`runCancel`/`applyCancelResult`/`toggleTask`)
- **根治**: 上記 processor で直列化 + intent revision で古い応答を弾く + drain後の確定GET。

### H3. 起動・online復帰時の GET とキュー再送の競合
- **症状**: 通常GETと `flushQueue` が独立起動。`applyCreateResult` が cache の `done===false` を
  「利用者が取消した」と誤解するが、実際は再送POSTより先に返った古いGET結果でもありうる。
  → 取消していないのに作ったばかりの record を補償DELETEしてしまう。逆順ではDBがON・画面がOFFに割れる。
- **該当**: `queries.ts`(`useTasksQuery`)、`useTaskPersistence.ts`(`applyCreateResult`/`flushQueue`/mount・online effect)
- **根治**: pending がある member は**先にキューを直列解決→その後GET**。または GET結果へ未同期intentを
  必ず rebase してから表示。補償取消の条件は「利用者が明示的にOFFにした revision/tombstone」だけにする。

---

## 優先度: 中(3件)

### M1. JST日跨ぎで通常送信と再送の日付が分かれ、前日へ記録されうる
- query key が member のみで JST 0時の自動切替がない。通常mutationは date 省略(サーバ当日)だが
  flush は `operation.date` を送るため非対称。create成功時に root の `data.date` が summary の日付へ更新されない。
- **根治**: サーバ応答由来の日付を query key と root data で一致させ、JST 0時に当日GETへ切替。
  確定した `operation.date` は初回POSTと再送で同じように渡す(対称化)。

### M2. localStorage 書込み失敗の無言化
- `writeJson`/`enqueueOperation` が容量超過・利用不可を握りつぶし成否を返さない。POSTが通信断だと
  「キューに無い」を理由に `syncStatus="idle"` へ戻り、退避できていない事実を利用者へ示さない。
- **根治**: storage書込APIを boolean/Result 化し失敗を伝播。最低限タブ存続中の in-memory queue で再送し、
  永続退避できない間は中立な警告を表示。

### M3. 408/425/429 を確定エラー扱いでキュー削除
- 一時エラー判定が `status===0 || status>=500` のみ。408/425/429 は再試行可能・結果不明なのに
  `recoverFromDefinitiveError` で operation を削除してしまう(記録されていないのに楽観的ONが消える)。
- **該当**: `queries.ts`(`isTransientApiError`)
- **根治**: 確実に再送不能な 4xx(422、payload不一致の409 等)だけを確定エラーに列挙。
  408/425/429 はキュー保持、429 は `Retry-After` を尊重して同じ冪等キーで再送。

---

## 修正時に足すテスト
応答喪失 / 応答逆転(OFF→ON・2タスク) / GET↔flush 競合(2応答順) / JST日跨ぎ(fake timer) /
storage書込失敗(quota例外注入) / HTTP status 分類(408/429/422/409)。

## 進め方(委譲メモ)
- 上記H1〜3は**1つの修正スペック**にまとめて Cursor(**composer-2.5 fast:false** か **cursor-grok-4.5**)へ委譲。
  難所なので実装後に **Codex で再レビュー**。M1〜3は同スペックに含めても、別回でもよい。
- Fable は差分レビュー+実機確認のみ(品質チェックの実行はCursorに任せる)。
