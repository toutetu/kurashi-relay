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

## 3. 要確認(ダッシュボードアクセスが必要 — 推測しない)

Chrome拡張(Claude in Chrome)が未接続のため、以下はユーザーのログイン済みブラウザでの確認待ち:

- [ ] Renderサービス名(web / api それぞれ)
- [ ] RenderフロントのBuild Command / Publish Directory / `VITE_API_BASE_URL`現在値
- [ ] Render APIサービスのビルド方式(Dockerfileがリポジトリに無いため、どう動いているか)と環境変数一覧
- [ ] Laravel Cloudの組織名・Projnextと同一組織か
- [ ] Laravel Cloudで選択可能な東京リージョン名
- [ ] Laravel Cloud利用上限・通知設定
- [ ] 母・娘の実端末のlocalStorage実データ有無(コード上はUI設定のみのはずだが実機で確認)
- [ ] 本番画面のスクリーンショット保存(アプリ内ブラウザのscreenshotがタイムアウトするため未取得。テキストスナップショットは取得済み)

## 4. Phase 0 完了条件の判定

- URLとロールバック先: ✅ 実値で記録済み
- 既存画面とAPIの正常状態: ✅ 確認済み(レスポンス保存済み)
- サービス名・ビルド設定・Laravel Cloud構成: ⏸ ダッシュボード接続待ち(上記チェックリスト)
