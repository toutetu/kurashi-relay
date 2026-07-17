# くらしリレー
# Laravel Cloud移行・データ永続化 指示書

作成日: 2026-07-16  
対象リポジトリ: `toutetu/kurashi-relay`  
対象ブランチ: `main`  
構成: `frontend/` = React + TypeScript + Vite、`backend/` = Laravel 12 REST API

---

## 1. この指示書の目的

現在Renderで公開している「くらしリレー」について、次の構成へ安全に移行する。

- ReactフロントエンドはRender Static Siteに残す
- Laravel APIはLaravel Cloudへ移す
- データベースはLaravel CloudのServerless Postgresを使用する
- Laravel Cloudのリージョンは東京を第一候補とする
- 現在のRender APIは、移行確認が終わるまで削除しない
- 将来的なAWS移行は別フェーズとし、今回の実装範囲に混ぜない

明日から実利用するため、機能拡張よりも次を優先する。

1. 現在動いている画面を壊さない
2. 初回アクセス時の長い待ち時間を改善する
3. 記録が画面更新で消えないようにする
4. 問題発生時に旧Render APIへ戻せるようにする
5. 実際のURL・設定値を確認せず推測しない

---

## 2. 確定したデプロイ方針

### 本番構成

```text
利用者のスマートフォン／PC
        │
        ▼
Render Static Site
React + TypeScript + Vite
        │ HTTPS
        ▼
Laravel Cloud
Laravel 12 REST API
東京リージョン
        │
        ▼
Laravel Serverless Postgres
Laravel APIと同一リージョン
```

### 採用理由

- Laravel Cloudはすでに契約・カード登録済みである
- 月額課金を既存のLaravel Cloud利用分とまとめて確認できる
- Laravelに最適化された運用画面を使える
- 東京リージョンを利用できる
- ReactをRenderに残すことで、今回の変更範囲をAPIとDBに限定できる
- フロントとバックエンドを同時に全面移行するより、障害時の切り分けが容易である

---

## 3. 現在の重要な状態

### 3.1 リポジトリ構成

```text
kurashi-relay/
├─ backend/      Laravel 12 REST API
├─ frontend/     React + TypeScript + Vite
├─ docs/
└─ scripts/
```

Laravel Cloudでは、モノレポ内のアプリルートとして`backend/`を指定する。

### 3.2 現在のAPI

現時点で確認できている主なAPIは次のとおり。

```text
GET /api/health
GET /api/dashboard
```

### 3.3 現在のデータ保存

現在の「くらしのおしごと」「ママの家事手帖」等の一部状態は、Reactコンポーネント内の`useState`で保持されている。

そのため、現状では次の問題がある。

- ページ更新で状態が初期化される可能性がある
- 別端末・別ブラウザでは状態を共有できない
- Laravel CloudへAPIを移すだけでは記録保存は実現しない
- Postgresを作るだけでも、保存APIがなければデータは入らない

**デプロイ先移行とデータ永続化は別作業として扱い、段階的に実装すること。**

---

## 4. 今回の実装範囲

### 必須

- Laravel APIをLaravel Cloudへデプロイ
- Laravel Serverless Postgresを作成し、API環境へ接続
- Laravel Cloud用の本番環境変数を設定
- RenderフロントからLaravel Cloud APIへ接続
- CORS設定を本番フロントURLに対応
- APIヘルスチェック
- 基本的なデータ保存用マイグレーション
- 記録保存API
- Reactから記録保存APIを呼び出す
- 通信失敗時に入力を失わない暫定ローカル保存
- 移行前後のスモークテスト
- ロールバック手順の確認
- 設計判断を`docs/design-decisions.md`へ記録

### 今回は行わない

- ReactのLaravel Cloud移行
- ReactのAWS移行
- Laravel APIのAWS移行
- ProjnextのRender移行
- 本格的な複数ユーザー認証
- Google OAuth
- Google Calendar連携
- キュー、Redis、メール通知
- PDF出力
- 大規模なUI変更
- 既存デザインの再設計

---

## 5. 実装の基本原則

1. **既存画面を壊さない**
2. **破壊的マイグレーションを行わない**
3. **本番データを消す処理を自動実行しない**
4. **秘密情報をGitへコミットしない**
5. **実URL、Laravel Cloud環境名、Renderサービス名を推測しない**
6. **旧Render APIをすぐ削除しない**
7. **切り替え前にLaravel Cloud API単体で動作確認する**
8. **フロント切り替えは環境変数だけで戻せる構成にする**
9. **入力直後は画面へ反映し、通信失敗時も記録を失わせない**
10. **既存の「せめない設計」と世界観を変更しない**
11. **機能追加より、保存・復元・切り戻しを優先する**
12. **未確認事項は推測せず、作業ログへ「要確認」と明記する**

---

## 6. AIごとの役割分担

### 6.1 Fable

#### 主担当

- 全体進行管理
- 本指示書と既存設計資料の整合確認
- Laravel Cloud移行の手順整理
- 実際の管理画面を見ながら設定値を確認
- Cursorへ渡す実装指示の具体化
- Codexへ渡すレビュー対象の整理
- 変更差分のレビュー
- 実機確認
- ロールバック判断
- `docs/design-decisions.md`への設計判断記録
- 完了時の引継ぎと日報整理

#### 原則

- 大規模な実装は直接行わずCursorへ委譲する
- 難しい設計判断・データ整合性・セキュリティレビューはCodexへ依頼する
- 実URLや環境設定値を確認せず補完しない
- 変更前後の状態を記録する
- 実装完了、デプロイ完了などの区切りで進捗をまとめる

### 6.2 Cursor

#### 主担当

- Laravelバックエンド実装
- Postgres向けマイグレーション
- Eloquentモデル
- Controller、Service、Request、Resource
- 保存・取得API
- APIテスト
- React側のAPIクライアント修正
- `localStorage`による暫定保存
- 再送・同期処理の最小実装
- Render用環境変数参照の確認
- Laravel Cloudで実行可能なビルド設定の確認
- 既存テスト、Lint、型チェック、ビルドの実行

#### 実装時の注意

- 最初に`AGENTS.md`を読む
- 既存コードと既存設計を確認してから変更する
- 大規模なリファクタリングを同時に行わない
- 既存UI・CSS・演出を変更しない
- API URLをソースコードへ直書きしない
- 本番URLをコミットしない
- `.env`をコミットしない
- migration内で既存テーブルをdropしない
- 保存失敗時にユーザー操作を失わせない
- 楽観的更新を行う場合は失敗時の状態を明示する
- 最後に変更ファイル、テスト結果、未完了事項を報告する

### 6.3 Codex

#### 主担当

- Laravel Cloud移行設計のレビュー
- DBスキーマレビュー
- API契約レビュー
- データ整合性レビュー
- 同期・重複登録・再送設計レビュー
- CORS・認証前提・秘密情報管理のレビュー
- Laravel Cloudのデプロイ設定レビュー
- マイグレーションの安全性レビュー
- Cursor実装差分のコードレビュー
- テスト不足・障害時挙動の指摘
- AWS移行を見据えた過度なベンダーロックインの有無の確認

#### Codexへ特に確認させる項目

- 同じ操作を再送した際に二重加算されないか
- 完了取消でポイントやスタンプが不整合にならないか
- 子どもの操作と母の確認操作を将来区別できるか
- 日付境界を日本時間で正しく扱えるか
- API失敗後の再送で二重登録されないか
- PostgreSQLで問題なく動作する型になっているか
- 本番マイグレーションを再実行しても安全か
- Laravel CloudのScale to Zero復帰後にエラーにならないか
- CORS許可範囲が広すぎないか
- `APP_DEBUG=false`になっているか

---

## 7. 推奨する作業フェーズ

### Phase 0: 現状確認と退避

#### 作業

- 現在のRenderフロントURLを確認
- 現在のRender API URLを確認
- Renderのサービス名を確認
- Laravel Cloudの組織名を確認
- Projnextと同一組織か確認
- Laravel Cloudで利用可能な東京リージョンを確認
- 現在の本番環境変数を一覧化
- 現在の`main`最新コミットを確認
- ローカルで既存テストを実行
- 現在の本番画面をスクリーンショット保存
- 現在のAPIレスポンスを保存
- 旧Render API URLをロールバック用に記録

#### 完了条件

- 現在のURLとサービス名が推測ではなく実値で記録されている
- 既存画面とAPIの正常状態が確認できている
- ロールバック先が明確である

### Phase 1: Laravel CloudへAPIのみ先行デプロイ

#### Laravel Cloud設定

- リポジトリ: `toutetu/kurashi-relay`
- ブランチ: `main`
- Application Root: `backend`
- リージョン: 東京
- Compute: 最小構成から開始
- Scale to Zero: 有効
- PHP: Laravel 12対応バージョン
- `APP_ENV=production`
- `APP_DEBUG=false`

#### 環境変数

最低限、次を設定する。

```env
APP_NAME="くらしリレー API"
APP_ENV=production
APP_DEBUG=false
APP_URL=<Laravel Cloudで発行された実URL>
APP_LOCALE=ja
APP_FALLBACK_LOCALE=ja
CORS_ALLOWED_ORIGINS=<Renderフロントの実URL>
```

DB関連はLaravel Cloudから注入される値を使用し、ソースコードへ記載しない。

#### 動作確認

```text
GET <Laravel Cloud URL>/api/health
GET <Laravel Cloud URL>/api/dashboard
```

#### 完了条件

- Laravel Cloud URLから200が返る
- エラーレスポンスがHTMLではなく適切なJSONで返る
- ログに致命的エラーがない
- まだRenderフロントの接続先は変更しない

### Phase 2: Serverless Postgres作成・接続

#### 設定

- Laravel APIと同じ東京リージョン
- 最小のCompute設定から開始
- 容量は初期最小構成
- 利用がない場合の休止を有効化
- Laravel Cloudアプリ環境へAttach

#### 確認

- `DB_CONNECTION=pgsql`として接続されること
- Laravelから疎通できること
- `php artisan migrate:status`が実行できること
- 文字コード、日本語、日時が正常に保存できること
- Laravel側のタイムゾーン方針を確認すること

#### 日時方針

- DB保存時刻は原則UTC
- 画面上の日付判定と表示は`Asia/Tokyo`
- 「今日の記録」の日付境界は日本時間
- 日付のみの値と日時の値を混同しない

### Phase 3: 最小データモデル実装

最初から完全なユーザー管理を作らず、母・娘の固定利用を前提に最小構成で始める。ただし、将来の複数ユーザー対応を妨げない設計にする。

#### 推奨テーブル

名称は既存設計と実装の整合を確認して最終決定する。

##### `family_members`

- `id`
- `name`
- `role`（例: `mother`, `child`）
- timestamps

##### `task_definitions`

- `id`
- `owner_role`
- `category`
- `title`
- `point_value`
- `is_active`
- `sort_order`
- timestamps

##### `task_records`

- `id`
- `family_member_id`
- `task_definition_id`
- `record_date`
- `completed_at`
- `source`
- `idempotency_key`
- timestamps

##### `reward_balances`または導出可能な履歴テーブル

ポイント残高を直接更新するだけの設計にせず、可能なら履歴から再計算できる形を優先する。

##### `reward_collections`

- 獲得したゾンビ
- 獲得したお菓子
- 獲得日
- 種別
- 関連する達成記録

#### 必須設計条件

- 同一タスク・同一日・同一メンバーの重複完了を防止
- API再送による二重加算を防止
- 完了取消を履歴として扱える
- ポイント残高と実績の不整合を検知できる
- 将来、母による確認済み状態を追加できる
- 将来、入力者区分を追加できる
- 将来、複数端末から使える
- 個人情報を必要以上に保存しない

### Phase 4: 保存・取得API実装

APIパスは既存契約との整合を確認して決める。例:

```text
GET    /api/tasks?date=YYYY-MM-DD&member=child
POST   /api/task-records
DELETE /api/task-records/{id}
GET    /api/rewards/summary?member=child
GET    /api/rewards/collections?member=child
```

#### `POST /api/task-records`の要件

- 入力検証
- 認識可能なタスクのみ登録
- `idempotency_key`を受け取れる
- 同一キーの再送は同じ結果を返す
- 成功時に最新ポイントを返す
- DBトランザクションを使用
- 二重加算を防ぐ
- エラー時に部分更新を残さない

#### 削除・取消の要件

- 物理削除より取消履歴または論理取消を検討
- 取消後のポイントを再計算
- 10回達成報酬などの境界をまたぐ場合の挙動を定義
- 一度獲得したコレクションを取消で消すかどうかは、仕様確認なしに決めない

### Phase 5: Reactの永続化対応

#### 基本方針

- 初回表示時にAPIから当日の状態を取得
- 操作時は画面へ即時反映
- 同時にAPIへ保存
- API失敗時は`localStorage`へ未同期記録を保存
- 次回起動または通信復旧時に再送
- `idempotency_key`で二重登録を防止
- 同期状態をユーザーに責める表現で表示しない

#### 推奨表示

- 正常保存: 原則表示不要
- 同期中: 小さく「保存中」
- オフライン／失敗: 「あとで保存します」
- 復旧後: 「保存できました」

「失敗しました」「入力が無効です」など、利用者を責める印象の強い表現は避ける。

#### 暫定ローカル保存対象

- タスク完了状態
- 未同期操作
- 現在画面に必要なポイント表示
- 獲得演出済み状態
- APIの最終同期日時

`localStorage`は本番DBの代替ではなく、通信障害時の一時退避として扱う。

### Phase 6: Laravel Cloud APIの本番試験

#### APIテスト

- `/api/health`
- 当日タスク取得
- 完了登録
- 同一リクエスト再送
- 完了取消
- ポイント更新
- 10回達成境界
- 日本時間の日付切り替え
- 不正日付
- 存在しないタスク
- DB休止後の初回アクセス
- Laravel Cloud再デプロイ後の保存データ維持

#### Reactテスト

- 初回読込
- タスク完了
- 再読み込み後の復元
- ブラウザを閉じて再表示
- スマートフォンでの操作
- API停止時の操作
- API復旧後の同期
- 同じ操作の連打
- 戻る操作
- 既存の応援オーバーレイ
- ゾンビ／お菓子獲得演出

#### 完了条件

- ページ更新後も記録が残る
- 同じ操作を再送しても二重加算されない
- Laravel Cloudが休止から復帰しても操作できる
- 既存UI・演出が壊れていない
- Renderフロント切り替え前にAPI単体試験が完了している

### Phase 7: Renderフロントの接続先切り替え

Render Static Siteの環境変数を変更する。

```env
VITE_API_BASE_URL=<Laravel Cloud APIの実URL>
```

#### 手順

1. 現在の`VITE_API_BASE_URL`を記録
2. Laravel Cloud API URLへ変更
3. Render Static Siteを再デプロイ
4. デプロイログ確認
5. PCで確認
6. スマートフォンで確認
7. CORS確認
8. 保存・再読込確認
9. 旧Render APIは残したままにする

#### 完了条件

- RenderフロントからLaravel Cloud APIを呼べる
- ブラウザコンソールにCORSエラーがない
- API URLが本番ビルドへ正しく反映されている
- 記録がPostgresへ保存される
- 再読込後に復元できる

### Phase 8: 安定確認と旧Render API停止

#### 安定確認

- 朝・昼・夜の複数回利用
- スマートフォンからの利用
- Laravel Cloudの休止復帰
- 翌日の日付切り替え
- 複数タスクの連続操作
- ポイント境界
- 未同期記録の再送

#### 旧Render APIの扱い

1. まず稼働したまま残す
2. 問題がなければ停止
3. 停止後も一定期間設定を保存
4. 最終確認後に削除を検討

ユーザーの明示的な確認なしに、旧Render APIを削除しない。

---

## 8. ロールバック手順

Laravel Cloud側で重大な問題が発生した場合は、次の順番で戻す。

1. Render Static Siteの`VITE_API_BASE_URL`を旧Render API URLへ戻す
2. Renderフロントを再デプロイ
3. 旧画面が表示できることを確認
4. Laravel Cloud側のログとDB状態を確認
5. DBデータを削除せず原因調査
6. 修正後、再度Laravel Cloud API単体試験からやり直す

### 注意

旧Render APIへ戻した場合、旧APIがDB保存未対応であれば、Laravel Cloud移行後に保存したデータは旧画面へ表示されない可能性がある。

フロント切り替え前に次を確認する。

- Laravel Cloud DBのバックアップ方法
- データエクスポート方法
- 切り戻し時の表示差異
- `localStorage`未同期データの保持

---

## 9. Laravel Cloud側で確認する項目

- Application Rootが`backend`
- 対象ブランチが`main`
- PHPバージョン
- 東京リージョン
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL`
- `CORS_ALLOWED_ORIGINS`
- DBのAttach状態
- DBリージョン
- デプロイコマンド
- マイグレーション実行方法
- Scale to Zero設定
- 利用上限・通知設定
- ログ閲覧方法
- バックアップ／復元方法

---

## 10. Render側で確認する項目

- Static Siteの実URL
- 対象ブランチ
- Build Command
- Publish Directory
- `VITE_API_BASE_URL`
- 再デプロイ結果
- 旧Render APIの実URL
- 旧Render APIのサービス名
- 旧APIを停止・再開する方法

---

## 11. テスト・品質確認コマンド

### Laravel

```bash
cd backend
composer install
php artisan test
php artisan migrate:fresh --env=testing
php vendor/bin/pint --test
```

本番環境では`migrate:fresh`を絶対に実行しない。

本番は次のみ。

```bash
php artisan migrate --force
```

### React

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

### 必須確認

- テストが失敗したままデプロイしない
- 既存テストを削除して通さない
- エラーを握りつぶさない
- 本番API URLをテストへ直書きしない

---

## 12. 設計判断として記録する内容

`docs/design-decisions.md`へ、少なくとも次を追記する。

### Laravel Cloudを採用した判断

- 課題感: Render無料APIのコールドスタートで、実利用時の待ち時間が長い
- 選択肢: Render有料化、Laravel Cloud、AWS
- 決定: ReactはRenderに残し、Laravel APIとDBをLaravel Cloudへ移す
- 理由: 既存契約を利用できる、カード再登録不要、費用確認が容易、Laravel運用に慣れている、東京リージョン、短期間で移行しやすい

### ReactをRenderへ残す判断

- 課題感: API、DB、フロントを同時移行すると障害箇所が増える
- 決定: 今回はフロントを移行しない
- 理由: 変更範囲を限定し、環境変数だけで切り戻せるようにする

### AWSを今回採用しない判断

- 課題感: AWSは学習したいが、明日から生活で使うアプリである
- 決定: AWS移行は別フェーズ
- 理由: IAM、ネットワーク、RDS、監視等の学習と本番移行を同時に行うリスクを避ける

---

## 13. 将来計画

### Projnext

将来的に、Laravel Cloud上のProjnextをRenderへ移す案を検討する。ただし、今回のくらしリレー移行と同時に行わない。

検討時は次を比較する。

- Projnextの実利用頻度
- Laravel Cloudでのアプリ別使用量
- Render有料／無料構成
- コールドスタート許容度
- DB移行方法
- 移行によるLaravel Cloud利用料金の削減額

### AWS

AWSは次の移行・学習先候補とする。

初回の学習対象は、生活で毎日使うくらしリレーより、影響の小さいProjnextまたは検証環境を優先する。

候補構成:

```text
Render Static Site
        │
        ▼
AWS App Runner
Laravel API
        │
        ▼
Amazon RDS PostgreSQL
```

AWS移行は別の指示書を作成し、費用上限・IAM・VPC・RDS・CloudWatch・バックアップ・ロールバックを設計してから開始する。

---

## 14. 完了報告フォーマット

各AIは作業完了時に次の形式で報告する。

```markdown
## 実施した作業

- 
- 

## 変更したファイル

- 
- 

## デプロイ先

- Renderフロント:
- Laravel Cloud API:
- Database:
- 対象ブランチ:
- 対象コミット:

## 確認結果

- Laravelテスト:
- Pint:
- React lint:
- React typecheck:
- React test:
- React build:
- API health:
- DB保存:
- 再読み込み後の復元:
- スマートフォン確認:
- CORS:

## 未完了

- 
- 

## 要確認

- 
- 

## ロールバック方法

- 
```

---

## 15. コミット・push・PR運用

- 作業は小さな単位でコミットする
- Conventional Commitsを使用する
- 例:

```text
docs: add Laravel Cloud migration plan
feat(api): persist task completion records
feat(frontend): sync task records with API
fix(api): prevent duplicate reward increments
chore(deploy): configure Laravel Cloud production environment
```

- コミットとpushは既存のプロジェクト運用ルールに従う
- PR作成はユーザー確認後に行う
- 本番環境変数や秘密情報はコミットしない
- 設計判断と実装を同じ巨大コミットへまとめない

---

## 16. 作業開始時に最初に確認すること

以下は推測せず、管理画面または既存設定から確認する。

- Renderフロントの正確なURL
- 旧Render APIの正確なURL
- Renderのサービス名
- Laravel Cloudの組織名
- Laravel Cloud上の既存Projnextの構成
- Laravel Cloudで選択可能な東京リージョン
- Laravel Cloud APIの発行URL
- 現在の本番環境変数
- 現在のRenderビルド設定
- 本番データがすでに存在するか
- `localStorage`に実利用データが存在するか
- 既存のAPI契約書と最新実装との差異

確認できない項目は、勝手に補完せず「要確認」として報告する。

---

## 17. 最終受け入れ条件

以下をすべて満たした時点で、Laravel Cloud移行完了とする。

- ReactはRenderで正常表示される
- Laravel APIはLaravel Cloud東京リージョンで稼働する
- Serverless Postgresが接続されている
- フロントからLaravel Cloud APIを呼び出せる
- CORSエラーがない
- タスク完了がDBへ保存される
- ページ更新後も完了状態が復元される
- 同じ操作の再送で二重加算されない
- API一時停止時にも入力が失われない
- API復旧後に未同期データを保存できる
- 日本時間の日付境界が正しい
- 既存の画面、応援演出、ポイント表示が壊れていない
- Laravel・Reactのテストとビルドが通っている
- ロールバック先が残っている
- `docs/design-decisions.md`が更新されている
- 実URL、コミット、確認結果、未完了事項が報告されている
