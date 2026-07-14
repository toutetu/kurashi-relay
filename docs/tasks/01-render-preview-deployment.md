# 実装指示書: Render検証用デプロイ環境

作成日: 2026-07-14
対象リポジトリ: `toutetu/kurashi-relay`（モノレポ）
前提ブランチ: 最新 `main`

---

## 1. 目的

Fixtureデータを使用した「くらしリレー」をRenderへ検証用デプロイし、娘向け画面（特に `/child-plan`）をスマートフォンから確認できるようにする。

今回は完成版の本番公開ではなく、表示と操作感を確認するための検証環境とする。

## 2. 現在の構成（調査結果に基づく）

* モノレポ（`backend/` + `frontend/` + `docs/`）
* backend: Laravel 12 REST API、PHP 8.2以上、固定Fixture、DB保存なし、認証なし
* frontend: React + TypeScript + Vite SPA、TanStack Query、B案v3 UI
* API: `GET /api/health`・`GET /api/dashboard`
* CORS: ローカル `5173` は常に許可。Render用は `FRONTEND_URL`、追加Originは `CORS_ALLOWED_ORIGINS`
* フロントAPI接続: `VITE_API_BASE_URL`（未設定時は同一ホストの`:8000`）
* 既存のDockerfile / `render.yaml` は未整備

## 3. 実装内容

### 3.1 frontend（Render Static Site）

* Root Directory: `frontend`
* Vite production build（`npm run build` → `dist/`）
* API URLは `VITE_API_BASE_URL` で切替（ビルド時に埋め込む）
* ローカル開発（未設定時の`:8000`自動接続）を壊さない
* React Routerの直接アクセス対応
  * `/child-plan` を直接開いても404にならない
  * Render SPA Rewrite: `/*` → `/index.html`
* 実際のRender URLや秘密情報をコードへ直書きしない

### 3.2 backend（Render Free Web Service / Docker）

* Root Directory: `backend`
* `backend/Dockerfile` を新規作成
* 必要なら `backend/.dockerignore` を作成
* PHP 8.2以上
* Composer依存関係はイメージビルド時にインストール（起動時には実行しない）
* `$PORT` で待ち受け、`0.0.0.0` バインド
* ヘルスチェック: `GET /api/health`
* DB・マイグレーション・認証・実データを追加しない（Fixtureのまま）
* `.env` や秘密情報をイメージに含めない
* Render固有コマンドに依存しすぎない、ECS移設しやすい構成

### 3.3 CORS

* 許可Originを環境変数から設定可能にする（`FRONTEND_URL`）
* `http://localhost:5173` と `http://127.0.0.1:5173` は常に許可
* 無制限の `*` は使わない
* 追加Originが必要な場合は既存の `CORS_ALLOWED_ORIGINS` も併用可能にする
* 環境変数名と設定方法をドキュメントへ記載

### 3.4 環境変数

backend（最低限）:

* `APP_ENV`
* `APP_DEBUG`
* `APP_KEY`
* `APP_URL`
* `LOG_CHANNEL`
* `FRONTEND_URL`
* `PORT`（Renderが付与）

frontend:

* `VITE_API_BASE_URL`（ビルド時）

`.env.example` を必要に応じて更新する。実際のURL・秘密情報はコミットしない。

### 3.5 Render Blueprint

可能ならリポジトリルートに `render.yaml` を追加する。

含めるもの:

* frontend Static Site
* backend Web Service（Docker）
* モノレポの `rootDir`
* frontendビルド設定とSPA rewrite
* backend Docker設定と `/api/health` ヘルスチェック
* 必要な環境変数キー（秘密値は `sync: false` 等でダッシュボード入力）

Render公式仕様に沿った最小構成とする（推測で拡張しない）。

### 3.6 起動待ち表示

Render Freeでは停止→初回起動に時間がかかることがある。

API読み込み中は既存 `DashboardLoading` を使い、次の趣旨を表示する:

「データを準備しています。少し時間がかかることがあります」

エラー時の再試行は既存 `DashboardError` を維持する。B案v3の全面変更はしない。

### 3.7 デプロイ手順書

`docs/render-preview-deployment.md` を新規作成し、次を記載する。

1. 今回のデプロイ目的
2. frontendとbackendの構成
3. Renderでのサービス作成手順
4. backendを先にデプロイする理由と手順
5. frontendへbackend URLを設定する手順
6. backendへfrontend URLを設定する手順
7. `APP_KEY` の準備方法
8. ヘルスチェック方法
9. `/child-plan` をスマートフォンで開く方法
10. 無料サービスの起動待ちについて
11. 更新デプロイ方法
12. ロールバック方法
13. 検証終了後の停止または削除方法
14. 実データを入力してはいけない旨

READMEからこの手順書へリンクする。

## 4. 制約

* 指示範囲外の機能を追加しない
* 認証・DB保存・Google Calendar等の外部連携を追加しない
* 実名、学校名、診断情報、実際の予定・トラブル記録を追加しない（Fixtureのみ）
* デザインを全面変更しない（B案v3トークンと共通コンポーネントを使う）
* テストやスクリプトを無効化しない
* ビルド通過のための不正な回避策を使わない
* `main` へ直接pushしない
* git commit / push は依頼者確認後のみ

## 5. 品質確認

### backend

```bash
cd backend
php artisan test
./vendor/bin/pint --test
```

### frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

### Docker（利用可能な場合）

* イメージビルド
* コンテナ起動
* `/api/health`・`/api/dashboard`
* `$PORT` 変更でも起動すること

実行できなかった確認は成功扱いにせず報告する。

## 6. 完了報告に含める項目

1. 調査した現在の構成
2. 作成・変更したファイル一覧
3. 各変更の目的
4. 実行したテストと結果
5. 実行できなかった確認
6. Renderで設定する環境変数
7. デプロイ時の手動作業
8. セキュリティ上の注意
9. 残っている課題
