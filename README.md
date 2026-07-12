# くらしリレー

母と娘の生活、予定と実績、支援、待機・拘束、回復を見えるようにし、家族・学校・支援機関との役割分担につなげるWebアプリのPoCです。

第1実装は、Laravel REST APIと独立したReact SPAを接続し、Laravel側の固定データを母向けホームダッシュボードと「今日の予定と実績」画面へ表示します。Inertiaは使用しません。

## 構成

```text
kurashi-relay/
├─ backend/      Laravel 12 REST API
├─ frontend/     React + TypeScript + Vite SPA
├─ docs/         企画・設計・API契約・ワイヤーフレーム
└─ scripts/
```

開発時は次の2プロセスを起動します。

```text
React SPA  http://localhost:5173
Laravel   http://localhost:8000
```

## 必要な環境

- PHP 8.2以上
- Composer 2
- Node.js 20.19以上、または22.12以上
- npm 11以上

## バックエンド

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve --host=127.0.0.1 --port=8000
```

Windows PowerShellでは `cp` の代わりに次を使用できます。

```powershell
Copy-Item .env.example .env
```

第1実装は固定データをServiceから返し、DBへ保存しません。

## フロントエンド

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
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

### React

```bash
cd frontend
npm run lint
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

詳細は [第1実装指示書](docs/codex-implementation-01.md) と [API契約](docs/api-contract-01.md) を参照してください。
