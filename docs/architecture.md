# くらしリレー
## アーキテクチャ方針 v0.2

> 2026-07-20: API-first SPA移行(A0〜A8)完了(DR-034 / DR-038)。
> React Router + TanStack Query + Laravel JSON API を Laravel Cloud から同一オリジン配信する。
> 移行手順の完了記録は `docs/archive/phases/api-first-spa-migration/` を参照する。
> 旧Inertia移行計画は `docs/archive/phases/inertia-migration/implementation-plan.md` に保管する。

目標構成(=現行):

```text
ブラウザ
  |
  | GET /, /records, /musume ...
  v
Laravel web catch-all
  |
  +--> spa.blade.php
         |
         +--> Vite React bundle (resources/js/main.tsx)
                |
                +--> React Router
                +--> TanStack Query
                +--> fetch /api/* (same origin)
                            |
                            v
                 Laravel API Controller
                            |
                 Service / Model / DB

Laravel --> Google Calendar等の外部API（将来）
```

# 1. 全体構成

```text
ブラウザ
  ↓ same origin
Laravel Cloud
  ├─ SPA catch-all → React Router pages
  └─ /api/* JSON API → TanStack Query / offline再送 / 外部client
  ↓
Service / Model / DB
```

React正本は `backend/resources/js`。旧 `frontend/` と Inertia runtime は削除済み。

# 2. モノレポ

```text
kurashi-relay/
├─ backend/          # Laravel API + SPA配信 + React正本
└─ docs/
```

LaravelとReactはコード上の責務を分離するが、
Issue、PR、仕様書、バージョン、本番配信は一つのリポジトリで管理する。

# 3. 責務分担

## Laravel

- HTTP API (`/api/*`)
- SPA用Blade / catch-all route（`SpaController` + `/app/*` 互換redirect）
- Vite asset配信（entry: `resources/js/main.tsx`）
- 入力検証
- 認証・権限（現状は未認証公開。再設計は別課題・DR-035）
- DB保存
- Google Calendar取込（将来）
- 集計・レポート（将来）
- API Resourceによるレスポンス整形

## React

- 表示
- 入力操作
- 画面遷移(React Router)
- ローディング
- エラーと再試行
- TanStack Queryによるサーバー状態管理
- ZodによるAPI response検証
- offline退避・online復帰時再送
- 端末ごとのレスポンシブ再配置

# 4. 第1実装由来のAPI

```text
GET /api/health
GET /api/dashboard?date=YYYY-MM-DD
```

現行APIは19本（`routes/api.php`）。契約の正本は `docs/api-contract.md`。

# 5. 認証方針

API接続とUIの成立を先に確認し、
Cookie、CSRF、CORS、ユーザー権限を一度に増やさないため、第1実装では認証を入れなかった。

現行runtime（`7a8391b` 以降）では API route に family-token middleware が付いておらず、
未認証のGET/writeが通る（DR-035）。アクセス保護の再設計は本移行とは別課題とする。
詳細は `docs/archive/phases/api-first-spa-migration/access-contract-a3.md`。

# 6. 開発環境

```text
Laravel + Vite SPA: http://localhost:8000
```

`backend/` で `composer install` / `npm install` / `npm run dev` と `php artisan serve` を使う。

# 7. 本番構成

- 本番URL: `https://kurashi-relay-production-olnfy0.laravel.cloud/`
- Laravel CloudでPHPとReact/Vite SPAを単一配信
- 旧Render Static Site（`kurashi-relay-web`）は Auto-Deploy 停止済み。service削除は任意・手動
- APIは全面廃止しない。通常画面・offline再送・通知・外部clientに必要なendpointは残す

# 8. 移行完了の要点(2026-07-20)

| 項目 | 結果 |
|---|---|
| A4 cutover | `FRONTEND_MODE=spa`（A6以降はflag自体を削除しSPA常時） |
| A5 | 本番安定確認完了 |
| A6 | Inertia runtime削除 `#69` |
| A7 | `frontend/` 削除 `#70` |
| React正本 | `backend/resources/js` |
| Vite entry | `resources/js/main.tsx` |
| web route | SPA catch-all + `/app/{path?}` → root redirect |
| rollback | A7以前はPR revert / A5時点release。Renderは停止済みrollback源 |
