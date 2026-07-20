# くらしリレー
## アーキテクチャ方針 v0.1

> 2026-07-20: DR-034により、Inertia中心のハイブリッド構成(DR-030)を将来方針から外し、
> React Router + TanStack Query + Laravel JSON API の同一オリジン構成へ移行する。
> 移行手順の正本は `docs/wip/api-first-spa-migration/implementation-plan.md` を参照する。
> 旧Inertia移行計画は `docs/archive/phases/inertia-migration/implementation-plan.md` に保管する。

目標構成:

```text
ブラウザ
  |
  | GET /, /records, /musume ...
  v
Laravel web catch-all
  |
  +--> spa.blade.php
         |
         +--> Vite React bundle
                |
                +--> React Router
                +--> TanStack Query
                +--> fetch /api/* (same origin)
                            |
                            v
                 Laravel API Controller
                            |
                 Service / Model / DB

Laravel --> Google Calendar等の外部API
```

# 1. 全体構成

```text
ブラウザ
  ↓ same origin
Laravel
  ├─ SPA catch-all → React Router pages
  └─ /api/* JSON API → TanStack Query / offline再送 / 外部client
  ↓
Service / Model / DB

Laravel ──外部API client──> Google Calendar API
```

移行完了後のReact正本は `backend/resources/js` とする。
`frontend/` は移行安定後に削除するロールバック用ソースとして残す。

# 2. モノレポ

```text
kurashi-relay/
├─ backend/          # Laravel API + SPA配信 + React正本
├─ frontend/         # 移行中のロールバック用(凍結)
└─ docs/
```

LaravelとReactはコード上の責務を分離するが、
Issue、PR、仕様書、バージョン、本番配信は一つのリポジトリで管理する。

# 3. 責務分担

## Laravel

- HTTP API (`/api/*`)
- SPA用Blade / catch-all route
- Vite asset配信
- 入力検証
- 認証・権限（方式は移行Phase A3で決定）
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

# 4. 第1実装

```text
GET /api/health
GET /api/dashboard?date=YYYY-MM-DD
```

ReactはLaravelのAPIを唯一のダミーデータ源として使用する。

# 5. 認証方針

API接続とUIの成立を先に確認し、
Cookie、CSRF、CORS、ユーザー権限を一度に増やさないため、第1実装では認証を入れなかった。

現在の公開APIは家族共有トークンで保護する。
API-first SPA移行後も通常画面のデータ取得・更新は `/api/*` を維持する。
本番の認証方式の見直しは `docs/wip/api-first-spa-migration/implementation-plan.md` のPhase A3で決定する。

# 6. 開発環境

```text
React(旧独立SPA): http://localhost:5173
Laravel:          http://localhost:8000
```

移行中はLaravel同一オリジンでSPAを確認できるようにする。
開発時のみ、旧独立SPAからLaravel APIを呼ぶ場合はOriginを許可する。

# 7. 移行中と移行後の本番構成

- 移行前〜切替直前: Laravel Cloud上のInertia runtimeと既存 `/api/*` を維持し、SPA runtimeを設定flagで並行準備する。
- 切替後: Laravel CloudでPHPとReact/Vite SPAを単一配信。Renderはrollback先として保持する。
- 安定確認後: Inertia関連コードと旧 `frontend/` を別releaseで削除する。

APIは全面廃止しない。通常画面・offline再送・通知・外部clientに必要なendpointは残す。
endpointのmethod、path、payload、status codeは移行中に変えない。
