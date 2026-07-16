# Phase 0: 現状確認と退避 記録

実施日: 2026-07-16
担当: Fable(進行管理)
指示書: `docs/deploy_change/kurashi-relay_laravel-cloud_deployment_instructions.md`

## 1. 実値で確認できた項目

### 本番URL(実アクセスで確認・推測ではない)

| 項目 | 実値 | 確認方法 |
|---|---|---|
| Renderフロント | `https://kurashi-relay-web.onrender.com` | HTTP 200、title「くらしリレー」、画面描画確認 |
| 旧Render API(ロールバック先) | `https://kurashi-relay-api.onrender.com` | `/api/health` `/api/dashboard` とも正常JSON |

### 保存したAPIレスポンス(退避)

- `docs/deploy_change/phase0/api-health-response.json` — `{"status":"success","data":{"service":"kurashi-relay-api"}}`
- `docs/deploy_change/phase0/api-dashboard-response.json` — status/data/meta 構造の完全レスポンス
- `docs/deploy_change/phase0/production-page-text.txt` — 本番フロントの描画テキストスナップショット

### リポジトリ状態

- リポジトリ: `toutetu/kurashi-relay`(origin実確認)
- ブランチ: `main` = `origin/main` 一致
- 最新コミット: `f6a6bbe` docs: add Laravel Cloud deployment instructions
- Laravel: `laravel/framework ^12.0`、PHP要求 `^8.2`
- **リポジトリ内にDockerfileなし**(vendor内のsail用を除く)。RenderのAPIビルド方式は管理画面で要確認

### ローカルテスト結果(2026-07-16実施)

| チェック | 結果 |
|---|---|
| backend `php artisan test` | ✅ 15 passed (70 assertions) |
| frontend `npm run lint` | ⚠️ 既存3エラー(`react-refresh/only-export-components` × MamaKajiContext.tsx:58, mood.tsx:9,61)— **main由来の既存問題。今回の移行作業起因ではない** |
| frontend `npm run typecheck` | ✅ |
| frontend `npm run test` | ✅ 21 passed (4 files) |
| frontend `npm run build` | ✅ dist生成OK |

### 現在の保存方式(コード実確認)

- タスク完了・ポイント・獲得演出などの状態は **Reactの`useState`のみ**(モック定数 + ローカル状態)。ページ更新で消える。
- `localStorage` 使用箇所は2つだけ(実コードgrep確認):
  - `kurashi-relay:mood`(きぶんカラー) — `features/mood/mood.tsx`
  - `kurashi-relay:sidebar-open`(サイドバー開閉) — `components/layout/AppShell.tsx`
- **端末に退避すべき「保存済み記録データ」は存在しない**(記録系はそもそも永続化されていないため、移行で失われる保存済みデータは無い)。
- 本番画面にも「この画面での変更は、まだサーバーには保存されません。」の注記が表示されている(実画面で確認)。

### API実装と契約書の差異

- `docs/api-contract-01.md` v0.1 = `GET /api/health` + `GET /api/dashboard` のみ。
- `backend/routes/api.php` の実装も同2エンドポイントのみで**一致。差異なし**。
- backendに**マイグレーションは0件**、DB接続コードなし(`.env.example`に「第1実装ではデータベースを使用しません」)。

### CORS実装(コード確認)

- `backend/config/cors.php` は環境変数 **`CORS_ALLOWED_ORIGINS`**(カンマ区切り)を参照。
- メモリの過去記録には「`FRONTEND_URL`をCORSに使用」とあるが、**現行コードは`CORS_ALLOWED_ORIGINS`**。Render側の実際の環境変数名は管理画面で要確認(メモリ記録が古い可能性)。

## 2. ロールバック用記録

- 旧Render API URL: `https://kurashi-relay-api.onrender.com`(稼働中・削除しない)
- 切り戻し手順: Render Static Site の `VITE_API_BASE_URL` を旧APIへ戻し再デプロイ(指示書§8)
- 旧APIはDB未使用のため、切り戻し時にLaravel Cloud保存データは旧画面に表示されない(指示書§8の注意どおり)

## 3. ダッシュボード実値(2026-07-16 ブラウザペインでログイン後に実確認)

### Render(ワークスペース: tomoko's workspace)

| 項目 | 実値 |
|---|---|
| フロントサービス名 | `kurashi-relay-web`(Static Site, region=global, Ungrouped) |
| フロントService ID | `srv-d9b2ql3eo5us73dqv7jg` |
| フロント対象ブランチ | `main`(PR Previews設定の参照から確認) |
| フロントRoot Directory | `frontend/` |
| **`VITE_API_BASE_URL`現在値** | **`https://kurashi-relay-api.onrender.com`**(本番配信中のJSバンドル`index-BHIE2MZf.js`から直接抽出。ロールバック時はこの値に戻す) |
| APIサービス名 | `kurashi-relay-api`(Web Service, **Docker**, **region=singapore**, プロジェクト「My project」/Production内) |
| API Service ID | `srv-d9b2150js32c73ai9ifg` |
| **API対象ブランチ** | **`feature/render-preview-deployment`**(mainではない。Dockerfileはこのブランチの`backend/Dockerfile`にのみ存在) |
| APIインスタンス | Free(0.1 CPU / 512MB)= 15分無アクセスで休止 |
| API環境変数 | 5件(値はマスク表示。旧APIは変更しないため未展開) |
| Auto-Deploy | web/apiともOn Commit |

### Laravel Cloud(ワークスペース: tomoko takahashi 個人・組織名なし)

- 既存アプリ: **ProjNexus**(`toutetu/ProjNexus`・環境main・Sleeping・`projnexus-main-butvrx.laravel.cloud`・2ヶ月前デプロイ)
- くらしリレーAPIは同一ワークスペースに新規作成予定
- 東京リージョン: 利用可(ユーザー確認済み。作成画面で正式名を最終確認)

## 4. Phase 0 完了条件の判定

- URLとロールバック先: ✅ 実値で記録済み
- 既存画面とAPIの正常状態: ✅ 確認済み(レスポンス保存済み)
- サービス名・ビルド設定・Laravel Cloud構成: ✅ 実値で記録済み(上表)

### 残る軽微な未確認(移行をブロックしない)

- 母・娘の実端末のlocalStorage(コード上はUI設定2キーのみで記録データなし)
- 本番画面のスクリーンショット(テキストスナップショットで代替済み)
- Laravel Cloudの利用上限・通知設定(Phase 1作成時に確認)
