# くらしリレー API

第1実装のLaravel REST APIです。独立したReact SPAからのHTTP/JSON通信だけを担当します。

## 起動

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

開発URLは `http://localhost:8000` です。

## API

- `GET /api/health`
- `GET /api/dashboard?date=YYYY-MM-DD`

第1実装のダッシュボードデータはLaravel内の固定Fixtureです。認証、Google Calendar連携、DB永続化、Blade/Viteフロントエンドは含みません。

## 品質確認

```bash
php artisan test
./vendor/bin/pint --test
```
