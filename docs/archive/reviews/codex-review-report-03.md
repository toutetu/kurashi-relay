# Codexレビュー報告 03

レビュー対象: `feature/oshigoto-persistence-frontend` の `git diff docs/phase6-results...HEAD -- frontend/`

結論: **重大3件、中程度3件。現状のまま本番フロントを永続化APIへ切り替えることは推奨しない。** 単一操作の通常成功・同一キー再送、`milestone_number` による報酬リビール抑止、800msタイマーのアンマウント時クリアは意図どおりである。一方、POSTの成否が不明な状態での取消、同一member内の並行mutation、再取得とキュー再送の競合には、利用者の最終操作をサーバ上でも失わせる経路がある。

## 重大

### 1. 応答不明のcreateを取り消すと冪等キーを捨て、サーバ側の完了を取り消せない

- **事象**: `record_id === null` の取消は、未同期createをキューから削除するだけで終了する。ところがfetchの通信エラーは「サーバへ届かなかった」と「サーバではcommit済みだが応答だけ失った」を区別できない。後者でも冪等キーを削除するため、canonical recordを再取得してDELETEする手段を失う。
- **該当ファイル・行**: `frontend/src/features/taskRecords/useTaskPersistence.ts:243-269,365-369`、`frontend/src/api/oshigotoStorage.ts:121-131`
- **具体的な失敗シナリオ**:
  1. OFFのタスクをONにし、キーKでPOSTする。
  2. サーバはrecord 7を作成してcommitするが、レスポンス受信前に接続が切れ、フロントは`status=0`としてcreateをキューに残す。
  3. 利用者が「とりけす」を押す。画面上はOFFになるが、`record_id`が未確定なのでキーKのcreateだけを削除する。
  4. キーKを再送しないためrecord 7を知ることもDELETEすることもなく、次回GETでタスクがONへ復活する。取消時点でcreateがまだin-flightでも、その後応答が失われれば同じ結果になる。
- **推奨修正**: `record_id`未確定のcreateは削除せず、「最終希望はOFF」というtombstone／`cancelAfterCreate`を保持する。同じキーKを再送してrecordを必ず解決し、成功レスポンスのIDを即DELETEする。初回POSTが未到達でも「作成して直ちに取消」になるため、最終状態を安全にOFFへ収束できる。この応答喪失シナリオを自動テストへ追加する。

### 2. 操作をキュー順に直列化しておらず、OFF→ONの最終操作がOFFで確定し得る

- **事象**: 各トグルはキューへ積まれる一方、`runCreate` / `runCancel`から直ちに別々のHTTP mutationも開始される。`inFlightRef`はflushによる同一操作の重複実行を避けるだけで、同一memberの異なる操作順を保証しない。古いcancelレスポンスも現在のintentを確認せず適用される。
- **該当ファイル・行**: `frontend/src/features/taskRecords/useTaskPersistence.ts:153-170,243-297,337-379`
- **具体的な失敗シナリオ**:
  1. record 7でONのタスクをOFFにし、DELETEが送信される。
  2. DELETE完了前に同じタスクをONへ戻し、別キーのPOSTが送信される。
  3. POSTが先にサーバへ到達すると、まだ有効なrecord 7を業務重複として返す。
  4. 後着のDELETEがrecord 7を取消し、`applyCancelResult`も無条件で画面をOFFにする。利用者の最後の操作はONなのに、DB・画面ともOFFで確定する。

  異なる2タスクのPOSTでも、summary=2の新しい応答後にsummary=1の古い応答が届くと、`result.summary`の丸ごと代入でゲージ・ポイント・コインが巻き戻る。`invalidateQueries(... refetchType: "none")`のため、その場でサーバ値へ自己回復しない。
- **推奨修正**: memberごとに単一のoperation processorを置き、HTTP送信も永続キューの順番どおり一件ずつ行う。タスクごとのintent revisionを持ち、古い応答はタスク状態へ適用しない。キューを掃き切った後に一度だけauthoritative GETを行い、summaryとsnapshotを確定する。OFF→ON、異なる2タスクの応答逆転、節目9→10を含む順序テストを追加する。

### 3. 起動・online時のGETとキュー再送が競合し、保存待ちの完了を補償取消してしまう

- **事象**: `useTasksQuery`の通常GETと、mount/`online`イベントの`flushQueue`が独立して開始される。`applyCreateResult`はquery cacheの`done === false`を「利用者が取消した」と解釈するが、これは単に再送POSTより先に返った古いGET結果でもあり得る。
- **該当ファイル・行**: `frontend/src/features/taskRecords/queries.ts:30-42`、`frontend/src/features/taskRecords/useTaskPersistence.ts:113-149,186-230,384-389`
- **具体的な失敗シナリオ**:
  1. オフラインでタスクをONにし、snapshotはON、createはキューへ残る。
  2. 30秒以上後にオンラインで再起動する。staleな`initialData`に対するGETとキューのPOST再送が並行する。
  3. GETが先に未作成のサーバ状態`done=false`をcacheへ書く。
  4. POSTは正常にrecordを作るが、`applyCreateResult`が現在cacheのfalseを見てcancelを積み、そのrecordをDELETEする。利用者は一度も取消していないのに完了が消える。

  逆順ではPOST成功後に古いGETがfalseを上書きし、DBはON・画面とsnapshotはOFFになる。
- **推奨修正**: pending queueがあるmemberでは、まずキューを直列に解決し、その完了後にGETする。あるいはGET結果へ未同期intentを必ずrebaseしてから表示する。`stillDone`ではなく、利用者が明示的にOFFへ変えたことを示すrevision/tombstoneだけを補償取消の条件にする。mountとonlineの両経路を応答順2通りでテストする。

## 中程度

### 1. JST日跨ぎで通常送信と再送の日付が分かれ、前日へ記録され得る

- **事象**: query keyはmemberだけで、JST 0時の自動切替もない。操作作成時には表示中dataの`date`を保存するが、通常mutationはそのdateを送らずサーバ当日へ委譲し、flush時だけ`operation.date`を送る。create成功時もrootの`data.date`はsummaryの日付へ更新されない。
- **該当ファイル・行**: `frontend/src/features/taskRecords/queries.ts:22-42,45-60`、`frontend/src/features/taskRecords/useTaskPersistence.ts:136-147,203-211,308-337`、`frontend/src/api/oshigotoStorage.ts:134-165`
- **具体的な失敗シナリオ**:
  1. 7月17日に開いた画面を日跨ぎ後も開いたまま、または7月18日に前日のsnapshotでオフライン起動する。
  2. 7月18日にON操作するとoperationは`date=2026-07-17`を持つ。
  3. 通常POSTが通信断なら、復旧時flushが明示的に17日を送り、18日の操作が前日へ保存される。
  4. 通常POSTが成功した場合はサーバが18日へ保存する一方、cache rootは17日のまま、`summary.date`だけ18日となり、18日の状態を17日snapshotキーへ保存する。
- **推奨修正**: サーバ応答由来の日付をquery keyとroot dataで一致させ、JST 0時に当日GETへ切り替える。操作開始前に表示日が現行サーバ日であることを保証し、確定した`operation.date`は初回POSTと再送の両方へ同じように渡す。日跨ぎのonline/offline双方をfake timerでテストする。

### 2. localStorage書込み失敗を成功扱いし、通信断との組合せで操作を無言で失う

- **事象**: `writeJson`は容量超過・利用不可を握りつぶし、`enqueueOperation`も成否を返さない。POSTが通信エラーになると、キューに存在しないことを理由に`syncStatus="idle"`へ戻すため、退避できていない事実を利用者へ示さない。
- **該当ファイル・行**: `frontend/src/api/oshigotoStorage.ts:48-75,95-104,134-147`、`frontend/src/features/taskRecords/useTaskPersistence.ts:243-269`
- **具体的な失敗シナリオ**: Safariの制限環境やquota超過で`setItem`がthrowする状態でタスクをONにし、同時にPOSTも通信断になる。画面は一時的にONだがqueueもsnapshotも保存されず、表示は「あとで保存します」ではなく無表示へ戻り、再読み込みで操作が消える。
- **推奨修正**: storage書込みAPIを`Result`またはbooleanにし、失敗を呼出元へ伝える。少なくともタブ存続中のin-memory queueへ保持して再送し、永続退避できない間は中立な警告を表示する。quota例外・localStorage getter例外を注入したテストで、`idle`へ戻らず操作が再送対象に残ることを確認する。

### 3. 408/425/429を確定エラーとしてキューから削除する

- **事象**: 一時エラー判定は`status === 0 || status >= 500`だけで、408 Request Timeout、425 Too Early、429 Too Many Requestsは`recoverFromDefinitiveError`へ流れてoperationを削除する。これらは再試行可能、または処理結果が不明な応答であり、固定した冪等キーで再送する方が安全である。
- **該当ファイル・行**: `frontend/src/features/taskRecords/queries.ts:26-28`、`frontend/src/features/taskRecords/useTaskPersistence.ts:175-184,255-266,286-291`
- **具体的な失敗シナリオ**: Laravel Cloudまたは前段がPOSTへ429を返すと、サーバに記録されていないのにoperationを削除してGETへ戻し、楽観的なON操作が消える。408でサーバ処理結果が不明な場合は、重大1と同じくサーバと画面が分岐し得る。
- **推奨修正**: 422とpayload不一致の409など、契約上確実に再送不能な4xxだけを確定エラーとして列挙する。408/425/429はキューを保持し、429では`Retry-After`を尊重して同じ冪等キーで再送する。各statusの分類テストを追加する。

## 軽微

なし。

## 確認できた点

- 単一createの初回送信とキュー再送では、生成済み`idempotencyKey`を使い回しており、通常経路でキーは固定される。
- `revealed_reward`はサーバの`item_slug`だけから解決し、同一memberの`milestone_number`をlocalStorageへ記録して二重表示を抑止している。
- 800msのリビールタイマーと保存完了タイマーはアンマウント時にclearされる。
- 単一操作だけなら、ゲージ9→10の満タン保持、取消時のmodulo折返し、`closeReveal`でのoverride解除は整合する。
- APIレスポンスとlocalStorage読込みにはzod検証があり、不正JSONで画面全体が例外終了する経路は避けている。

## 検証

- 依頼書どおりlint/typecheck/test/buildは再実行していない。既存の28テスト成功結果を前提に、差分と既存永続化テストを静的レビューした。
- 既存テストは単一mutationの成功、通常取消、同一キー再送、報酬一回、単純なoffline→onlineを確認しているが、上記の応答喪失、応答逆転、GETとflushの競合、JST日跨ぎ、storage書込み失敗は未カバー。
- `git diff --check docs/phase6-results...HEAD -- frontend/`: 成功。

## 総合判定

本番切替前に、重大1〜3を同じ「member単位の直列operation processor＋明示的な最終intent」へ統合して修正し、キューdrain後のauthoritative GETで確定することを推奨する。そのうえで日付を初回送信と再送で対称にし、storage不能・一時HTTPエラーでも操作をキューから落とさないことを投入条件とする。
