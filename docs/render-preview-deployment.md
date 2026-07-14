# Render検証用デプロイ手順書

くらしリレーを、FixtureデータのままRenderへ検証デプロイし、スマートフォンから娘向け画面（`/child-plan`）を確認するための手順です。

**本番公開ではありません。** 表示と操作感の確認専用です。実データは入力しないでください。

実装の詳細は [実装指示書](tasks/01-render-preview-deployment.md) を参照してください。

---

## 1. 今回のデプロイ目的

* Fixtureデータで母向けホームと娘向け `/child-plan` をスマホから確認する
* API読み込み（Render Freeの起動待ちを含む）と再試行の挙動を確認する
* 本番の認証・DB・外部連携は対象外

## 2. frontendとbackendの構成

| 役割 | 技術 | Renderサービス | Root Directory |
|---|---|---|---|
| frontend | React + Vite SPA | Static Site | `frontend` |
| backend | Laravel 12 REST API | Web Service（Docker） | `backend` |

* frontendはビルド成果物（`dist/`）を配信する
* backendは `backend/Dockerfile` でイメージをビルドし、`$PORT` / `0.0.0.0` で起動する
* データはメモリ上のFixtureのみ。DB・認証なし
* モノレポリポジトリ: `toutetu/kurashi-relay`
* Blueprint定義: リポジトリルートの `render.yaml`

## 3. Renderでのサービス作成手順

### 方法A: Blueprint（推奨）

1. [Render Dashboard](https://dashboard.render.com/) にログインする
2. **New → Blueprint** を選ぶ
3. GitHubリポジトリ `toutetu/kurashi-relay` を接続する
4. デプロイ対象ブランチを選ぶ（検証用ブランチでも可。`main` 直pushは運用ルールに従う）
5. `render.yaml` を検出したら、`sync: false` の環境変数を入力する（後述）
6. 作成を開始する

### 方法B: ダッシュボードから個別作成

Blueprintを使わない場合も、同じ考え方で個別作成できます。

**backend（先に作成）**

1. **New → Web Service**
2. リポジトリ接続、Root Directory: `backend`
3. Runtime: **Docker**
4. ヘルスチェックパス: `/api/health`
5. 環境変数を設定（後述）

**frontend（backendのURL確定後）**

1. **New → Static Site**
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Redirects/Rewrites に Rewrite: Source `/*` → Destination `/index.html`
6. 環境変数 `VITE_API_BASE_URL` に backend URL を設定してビルドする

## 4. backendを先にデプロイする理由と手順

frontendの `VITE_API_BASE_URL` は **ビルド時** に埋め込まれます。
backendの公開URLが先に決まっていないと、frontendを正しくビルドできません。

手順:

1. backendをデプロイする
2. `https://<api-service>.onrender.com/api/health` が成功することを確認する
3. そのURL（末尾スラッシュなし）を frontend の `VITE_API_BASE_URL` に設定する
4. frontendをデプロイ（または再デプロイ）する
5. backendの `FRONTEND_URL` に frontend のURLを設定し、backendを再デプロイまたは環境変数更新後に再起動する

## 5. frontendへbackend URLを設定する手順

1. Renderの frontend Static Site → **Environment**
2. `VITE_API_BASE_URL` = `https://<api-service>.onrender.com`（末尾 `/` なし）
3. **保存後、必ず再ビルド／再デプロイ**する（Viteはビルド時に環境変数を埋め込むため）

ローカル開発ではこの変数を未設定のままで問題ありません（同一ホストの `:8000` に接続します）。

## 6. backendへfrontend URLを設定する手順

1. Renderの backend Web Service → **Environment**
2. `FRONTEND_URL` = `https://<web-service>.onrender.com`（末尾 `/` なし）
3. 保存してサービスを再起動／再デプロイする

補足:

* `http://localhost:5173` と `http://127.0.0.1:5173` はコード側で常にCORS許可されます
* 追加Originが必要な場合のみ `CORS_ALLOWED_ORIGINS`（カンマ区切り）を使います
* `*` による全許可は使いません

## 7. APP_KEY の準備方法

Laravel起動に `APP_KEY` が必要です。ローカルで次を実行し、表示された値をRenderの環境変数へ設定します。

```bash
cd backend
php artisan key:generate --show
```

* 出力例: `base64:...`（この文字列全体を `APP_KEY` に設定）
* 生成したキーや `.env` をGitへコミットしない
* 検証終了後にキーを使い回す必要はない（破棄してよい）

## 8. ヘルスチェック方法

ブラウザまたは端末から:

```text
GET https://<api-service>.onrender.com/api/health
```

期待レスポンス（200）:

```json
{
  "status": "success",
  "data": {
    "service": "kurashi-relay-api"
  }
}
```

ダッシュボードの dashboard 確認:

```text
GET https://<api-service>.onrender.com/api/dashboard
```

## 9. `/child-plan` をスマートフォンで開く方法

1. frontendのURLを確認する: `https://<web-service>.onrender.com`
2. スマホブラウザで次を直接開く: `https://<web-service>.onrender.com/child-plan`
3. SPA Rewriteにより `index.html` へ送られ、React Routerが画面を表示する
4. API起動待ちのあいだは「データを準備しています…」と表示される
5. 失敗時は既存の「もう一度試す」で再取得できる

同一Wi-Fiである必要はありません。Renderの公開URLへインターネット経由でアクセスします。

## 10. 無料サービスの起動待ちについて

Render FreeのWeb Serviceは、一定時間アクセスがないと停止することがあります。
停止後の初回アクセスでは、起動に数十秒かかることがあります。

* 故障ではありません
* 画面の読み込み表示を待ち、必要なら再試行してください
* Static Site側は通常すぐ表示されますが、APIが起きるまでデータは出ません

## 11. 更新デプロイ方法

1. 変更をGitHubへpushする（対象ブランチ）
2. Root Directory配下の変更があれば、該当サービスが自動デプロイされる
3. frontendのAPI URLを変えた場合は、`VITE_API_BASE_URL` 更新後に **frontendを再ビルド**する
4. backendのCORS先を変えた場合は `FRONTEND_URL` を更新して再起動する

手動の場合は各サービスの **Manual Deploy** から実行できます。

## 12. ロールバック方法

1. Renderダッシュボードで対象サービスを開く
2. **Events / Deploys** から直前の成功デプロイを選ぶ
3. **Rollback**（または同等の再デプロイ）を実行する

Git側では、問題のあるコミットをrevertしたブランチを再デプロイする方法でも同等です。

## 13. 検証終了後の停止または削除方法

検証が終わったら、無料枠の保護と公開面の縮小のため次のいずれかを行います。

* 各サービスを **Suspend**（停止）する
* 不要ならサービスを **Delete** する
* Blueprintごと不要なら削除する

停止中も設定は残ることがあります。完全に不要なら削除してください。

## 14. 実データを入力してはいけない旨

この環境はFixtureの架空データ専用です。

* 実名を入れない
* 学校名を入れない
* 診断情報を入れない
* 実際の予定やトラブル記録を入れない
* 認証・DB・Google Calendar連携は使わない／追加しない

公開URLを知っている人はAPIを呼べる想定です。センシティブ情報を置かないでください。

---

## 環境変数一覧（設定チートシート）

### backend

| 変数 | 例 / 方針 |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | `php artisan key:generate --show` の出力 |
| `APP_URL` | `https://<api-service>.onrender.com` |
| `LOG_CHANNEL` | `stderr` |
| `FRONTEND_URL` | `https://<web-service>.onrender.com` |
| `PORT` | Renderが自動設定（手動不要） |

### frontend

| 変数 | 例 / 方針 |
|---|---|
| `VITE_API_BASE_URL` | `https://<api-service>.onrender.com`（**ビルド時**） |

---

## ローカルでのDocker確認（任意）

Dockerが使える場合:

```bash
cd backend
docker build -t kurashi-relay-api .
docker run --rm -p 8080:8080 -e PORT=8080 -e APP_KEY=base64:xxxx -e APP_URL=http://localhost:8080 -e APP_ENV=production -e APP_DEBUG=false -e LOG_CHANNEL=stderr -e FRONTEND_URL=http://localhost:5173 kurashi-relay-api
```

確認:

* `http://localhost:8080/api/health`
* `http://localhost:8080/api/dashboard`
