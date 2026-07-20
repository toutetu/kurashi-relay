# くらしリレー

母と娘の生活、予定と実績、支援、待機・拘束、回復を見えるようにし、家族・学校・支援機関との役割分担につなげるWebアプリのPoCです。

React Router + TanStack Query + Laravel JSON API のSPAを、Laravel Cloudから同一オリジンで配信します(DR-034)。

本番URL: https://kurashi-relay-production-olnfy0.laravel.cloud/

## 現在の実装計画

実装済みの機能、未実装領域、今後の開発順序は [くらしリレー 実装計画](docs/development-plan.md) を参照してください。
今後「次に何を実装するか」を判断するときは、この文書を全体ロードマップの正とします。
画面配信移行の詳細は [API-first SPA移行 実装計画](docs/wip/api-first-spa-migration/implementation-plan.md) を参照してください。

## 構成

```text
kurashi-relay/
├─ backend/      Laravel 12 REST API + React SPA（resources/js）
├─ docs/         企画・設計・API契約・ワイヤーフレーム
└─ scripts/
```

開発時は backend だけで起動します（Vite が SPA を配信）。

```text
Laravel + Vite SPA  http://localhost:8000
```

## 必要な環境

- PHP 8.2以上
- Composer 2
- Node.js 20.19以上、または22.12以上
- npm 11以上

## バックエンド / SPA

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
npm install
npm run build
php artisan serve --host=127.0.0.1 --port=8000
```

開発中のホットリロードは次でも可です。

```bash
cd backend
npm run dev
# 別ターミナル
php artisan serve --host=127.0.0.1 --port=8000
```

Windows PowerShellでは `cp` の代わりに次を使用できます。

```powershell
Copy-Item .env.example .env
```

## API

```text
GET http://localhost:8000/api/health
GET http://localhost:8000/api/dashboard?date=YYYY-MM-DD
```

`date` の省略時はPoCの基準日 `2026-07-12` を使用します。不正な日付は422のJSONを返します。

## 品質確認

### Laravel

```bash
cd backend
php artisan test
./vendor/bin/pint --test
```

Windows PowerShellではPintを次のように実行できます。

```powershell
php vendor/bin/pint --test
```

### React SPA（backend/resources/js）

```bash
cd backend
npm run typecheck
npm run test
npm run build
```

## 第1実装の範囲外

- 認証、Laravel Sanctum、ユーザー登録、ログイン
- Google OAuth、Google Calendar API
- DB永続化
- 支援者アカウント、支援者別レポート、PDF、共有URL
- 通知、メール、外部ゲーム連携
- 本番デプロイ

詳細は [第1実装指示書](docs/archive/specs/codex-implementation-01.md) と [API契約](docs/api-contract.md) を参照してください。
