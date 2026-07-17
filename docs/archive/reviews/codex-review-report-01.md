# Codexレビュー報告 01

レビュー対象: `main...feature/oshigoto-persistence-api` (`HEAD: 86fb9d4`)

結論: **現状のまま本番投入不可**。通常の同一キー再送、同一日タスク重複、取消時の再集計、部分ユニークインデックス、SQLiteでのマイグレーション再実行は概ね正しく実装されている。一方、重複扱いになった別の `idempotency_key` が保存されないため、応答喪失後の再送が取消済み記録を復活させる経路がある。また、公開APIとしてのアクセス制御がない。

## 重大(本番前に必ず修正)

### 1. 重複扱いになった別キーの再送が、取消後に新規完了として登録される

対象: `backend/app/Services/TaskRecordService.php:57-67`, `202-212`

同一 `member × task × date` の有効レコードを別キーでPOSTした場合、既存レコードを返すだけで、その別キーをどこにも保存していない。このため、次の順序で取消が意図せず打ち消される。

1. キーAで完了を作成する。
2. キーBで同じ完了をPOSTし、既存レコードへ重複排除される。
3. キーBへの200応答が通信障害でクライアントへ届かない。
4. ユーザーがキーAのレコードを取り消す。
5. 未同期キューがキーBを再送する。
6. キーBの受理履歴がなく、有効レコードも取消済みのため、新しい完了レコードが201で作成される。

SQLite上でこの順序を実行し、最初のキーBは `200 / deduplicated=true / record.id=1`、取消後の同じキーBは `201 / deduplicated=false / record.id=2` になることを確認した。これはPhase 5のオフライン再送とトグル取消を組み合わせると実運用で起こり得る。

`idempotency_key` を `task_records` だけに持たせず、受理した全操作キーとpayload fingerprint、返却するcanonical record/resultを記録する専用テーブル等が必要。業務重複で既存レコードを返す場合もキーBを記録し、以後は状態が変わっても同じ結果へ解決すること。修正後は上記6手順をFeature Testへ追加すること。

### 2. 公開される更新APIにアクセス制御がなく、任意の第三者が記録を作成・取消できる

対象: `backend/routes/api.php:13-17`, `backend/app/Http/Requests/MemberRequest.php:9-12`, `backend/app/Http/Controllers/Api/TaskRecordController.php:37-43`

全ルートが認証・認可ミドルウェアなしで公開され、Form Requestも常に認可する。特に `DELETE /api/task-records/{id}` はmember確認もなく、連番IDだけで取消できる。CORSはブラウザの読み出し制御であり、curlや別サーバーからの直接リクエストを防がない。

本格的な複数ユーザー認証が今回の範囲外であることは理解するが、Renderフロントから到達可能なLaravel Cloud APIをこの状態で本番公開するのは不可。少なくとも本番切替前に、正規利用者だけが更新できるアクセス制御とレコード単位の認可を導入すること。インフラ側で代替する場合は、Renderの公開SPAから安全に利用でき、クライアントへ恒久秘密を埋め込まない方式であることを実機確認する必要がある。

## 中程度(修正推奨)

### 1. PostgreSQLセッションのタイムゾーンがUTCに固定されていない

対象: `backend/app/Services/TaskRecordService.php:75,122`, `backend/config/database.php:85-98`

`now('UTC')` を渡している点、`record_date` をJSTの日付として別カラムにしている点、レスポンスをJSTへ変換している点は正しい。一方、Eloquentの標準DB日時形式はオフセットを含まないため、PostgreSQLの `timestamptz` へ渡す値は接続セッションの `TimeZone` に依存する。pgsql接続設定に `timezone` がなく、UTC保存をコードだけでは保証できない。

pgsql接続を明示的にUTCへ設定し、本番相当PostgreSQLで `SHOW TIME ZONE`、UTC保存値、JSTレスポンス、JST 00:00前後の往復を確認すること。`record_date` はdate型なので現在の `whereDate` でも日付ずれは起きないが、date列への比較は単純な `where('record_date', $date)` の方が意図と索引利用を明確にできる。

### 2. PostgreSQL固有の競合・savepoint経路がテストされていない

対象: `backend/app/Services/TaskRecordService.php:69-89`, `163-215`, `backend/tests/Feature/Api/OshigotoPersistenceTest.php`

静的確認では、内側の `DB::transaction` はLaravel 12でsavepointとなり、PostgreSQLのunique違反後に外側トランザクションを継続する構造は妥当。部分unique indexと `DROP INDEX IF EXISTS` のSQLもpgsql/sqlite双方で有効である。

ただしテストはSQLite `:memory:` の逐次リクエストだけで、2接続からの同時POST、pgsqlのSQLSTATE `23505`、savepoint rollback後の勝者行取得、デッドロック・接続切断を通っていない。今回のローカルPHPには `pdo_pgsql` もなく、PostgreSQL実行確認はできなかった。本番切替前に実PostgreSQLで、同一キー、別キー同一タスク、異なるmemberで同一キー、10件目競合を並行実行する統合テストが必要。

また、現在は全 `QueryException` を競合候補として回復処理へ送っている。SQLSTATE `23505` かつ想定する制約名だけを回復対象に絞り、その他のDB障害はそのまま失敗させる方が安全。

### 3. 操作者・確認者・家庭境界を保存できず、将来の複数ユーザー化に大きな移行が必要

対象: `backend/database/migrations/2026_07_16_100001_create_family_members_table.php:13`, `backend/database/migrations/2026_07_16_100003_create_task_records_table.php:14-21`, `backend/app/Http/Requests/StoreTaskRecordRequest.php:27`

`family_members.role` がDB全体でuniqueで、APIもroleだけで対象者を解決するため、複数家庭・複数の子どもを追加できない。`task_records.family_member_id` は記録対象者であり、実際に操作した人、母の確認、娘本人の入力を表す列がない。`source` は任意文字列でクライアントが自由に指定でき、監査主体には使えない。

単一家庭PoCとしては動作するが、「娘本人の操作」「母の代理入力」「母の確認」を後から区別できるよう、少なくともactor/confirmationの設計方針と移行案を先に決めること。複数ユーザー化では `household_id` によるデータ分離と、roleのunique範囲変更が必要。

### 4. エラー契約に不一致があり、不正なDELETEパスが500になる

対象: `backend/routes/api.php:15`, `backend/app/Http/Controllers/Api/TaskRecordController.php:37-43`, `backend/bootstrap/app.php:48-78`

`DELETE /api/task-records/not-a-number` を実行すると、ルート制約がないまま `int $id` へ渡されてTypeErrorとなり、500と「データの取得中に問題が発生しました。」を返すことを確認した。404または422で扱うべき入力がサーバー障害になる。また、一般の500/405レスポンスには `errors` がなく、`docs/api-contract-01.md` の共通エラー形と一致しない。

ルートへ数値制約を付けるか明示検証し、すべてのAPIエラーで `status`, `message`, `errors` の形を統一すること。更新・取消時の500メッセージも「取得中」ではなく操作共通の文言が適切。

### 5. ポイントは導出式だが、履歴時点の単価を保持していない

対象: `backend/app/Services/RewardCalculator.php:47-54`, `backend/database/seeders/TaskDefinitionSeeder.php:34-63`

残高カラムを持たず、有効実績とadjustmentから毎回導出するため、残高だけがずれる問題は避けられている。一方、母のポイントは現在の `task_definitions.point_value` を過去の全レコードへJOINして再計算する。将来シーダーや管理操作で単価を変更すると、過去に獲得したポイントまで遡って変わり、当時の実績から同じ値を再現できない。

単価を不変とする運用を明文化するか、完了時単価をイベントへ保存する／ポイント台帳を追記専用で持つなど、履歴再現性を確保すること。コレクションは仕様どおり取消後も残るため、`collections_count > full_count` になり得ることもAPI利用側へ明記した方がよい。

## 軽微・提案

- DBスキーマの `role`, `owner_role`, `reward_collections.type`, `reward_adjustments.kind`, `source` は文字列長だけで、許可値のDB制約がない。API外のシード・運用作業による不正値を検知するため、check制約または監査コマンドを検討する。
- `reward_adjustments` は符号付きで、現在のテストは `lifetime_count=-1`, `full_count=-1`, `coins=-75` を正常値として期待している。手動補正で利用者表示が負数になってよいかを確認し、必要なら投入時の不変条件を定義する。
- `backend/.env.example` の「第1実装ではデータベースを使用しません」は今回の実装後は古い。Cloudが環境変数を注入する場合でも、開発者向け例と運用手順はpgsql永続化に合わせて更新した方がよい。
- Scale to Zeroについて、リクエストをまたぐメモリ状態や永続PDOを前提にしておらず、設計上の明確な阻害要因は見当たらない。ただしDB休止復帰の初回POST、トランザクション開始時の切断、応答喪失後の同一キー再送はLaravel Cloud実環境で未確認。
- Laravel Cloud固有SDKや独自DB APIへの依存はなく、標準Laravel/Eloquent/PostgreSQLと生SQLの部分indexだけなので、Amazon RDS for PostgreSQLへの移行を妨げる強いベンダーロックインは見当たらない。
- 差分内に秘密情報や `.env` のコミットは見当たらなかった。`APP_DEBUG=false` と本番CORSの実値はリポジトリ差分からは確認できないため、Laravel Cloud環境で別途確認が必要。

## テスト実行結果

- `cd backend && php artisan test`: **成功** — 31 tests / 208 assertions。
- `cd backend && php vendor/bin/pint --test`: **成功**。
- SQLite `:memory:` で `migrate --force` を同一プロセス内で2回実行: **成功**。2回目は `Nothing to migrate`。
- 同じSQLite DBで `db:seed --force` を2回実行: **成功**。最終件数は `family_members=2`, `task_definitions=10` で増殖なし。
- 10件目の報酬カタログを意図的に空にして例外を発生させる手動確認: **task_records=0 / reward_collections=0** で、外側トランザクションによる部分更新ロールバックを確認。
- 別キー重複→応答喪失想定→取消→同じ別キー再送の手動確認: **再送が201で新規レコードを作成**。重大1を再現。
- `DELETE /api/task-records/not-a-number` の手動確認: **500**。中程度4を再現。
- PostgreSQL: **未実行**。ローカル環境に `pdo_pgsql` / `psql` / PostgreSQL実体がなく、pgsql固有SQL・同時実行・savepointは静的レビューのみ。
- Laravel Cloud Scale to Zero復帰試験: **未実行**。

不足している自動テストは、重大1の再送順序、実PostgreSQL二接続の競合、想定外QueryException、報酬付与途中の例外ロールバック、非数ID、JST境界の保存値往復、シーダー2回、Scale to Zero復帰後初回POSTである。

## 総合判定(本番投入可否)

**本番投入不可。修正後に再レビューが必要。**

通常経路の集計、取消、節目再通過、SQLiteマイグレーション、シーダー冪等性は良好で、実装の土台は妥当。次の条件を満たすまでRenderフロントの接続先を切り替えないこと。

1. 重複扱いになった全idempotency keyを永続化し、取消後の古い再送で完了が復活しないこと。
2. 公開更新APIへ実効性のある認証・認可または同等のアクセス制御を付けること。
3. PostgreSQL接続タイムゾーンをUTCへ固定し、実PostgreSQLで同時POST・savepoint・部分unique index・日時往復を確認すること。
4. 上記の回帰テストと不正DELETE/共通エラー形のテストを追加し、全テストとPintを再実行すること。

これらを満たした後、Laravel CloudでScale to Zero復帰試験を行えば、本番可否を再判定できる。
