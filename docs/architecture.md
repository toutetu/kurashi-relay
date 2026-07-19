# くらしリレー
## アーキテクチャ方針 v0.1

> 2026-07-19: DR-030/DR-031により、DB target schema完成後にLaravel+Inertia+React中心の
> ハイブリッド構成へ段階移行する。以下のSPA+REST構成は現在稼働中の移行元として残す。移行手順は
> `docs/wip/inertia-migration/implementation-plan.md` を参照する。

目標構成:

```text
ブラウザ
  ↓ same origin / session
Laravel routes / middleware
  ├─ Inertia props / form redirect → React pages
  └─ 必要なJSON API → offline再送 / Service Worker / 通知 / 外部client
  ↓
Service / Model / 統合後DB

Laravel ──外部API client──> Google Calendar API
```

# 1. 全体構成

```text
ブラウザ
  ↓
React SPA
  ↓ HTTP / JSON
Laravel REST API
  ↓
データベース（第2実装以降）
```

第1実装では、LaravelのServiceが固定ダミーデータを返す。

# 2. モノレポ

```text
kurashi-relay/
├─ backend/
├─ frontend/
└─ docs/
```

LaravelとReactはコード上の責務を分離するが、
Issue、PR、仕様書、バージョンは一つのリポジトリで管理する。

# 3. 責務分担

## Laravel

- HTTP API
- 入力検証
- 認証・権限（第2実装以降）
- DB保存（第2実装以降）
- Google Calendar取込（将来）
- 集計・レポート（将来）
- API Resourceによるレスポンス整形

## React

- 表示
- 入力操作
- ローディング
- エラーと再試行
- TanStack Queryによるサーバー状態管理
- 端末ごとのレスポンシブ再配置

# 4. 第1実装

```text
GET /api/health
GET /api/dashboard?date=YYYY-MM-DD
```

ReactはLaravelのAPIを唯一のダミーデータ源として使用する。

# 5. 第1実装で認証を入れない理由

API接続とUIの成立を先に確認し、
Cookie、CSRF、CORS、ユーザー権限を一度に増やさないため。

現在の公開APIは家族共有トークンで保護する。Inertia I5では通常Web画面をLaravel session認証へ移し、
残存APIは利用clientに応じてsession+CSRFまたは専用tokenを選ぶ。

# 6. 開発環境

```text
React:       http://localhost:5173
Laravel API: http://localhost:8000
```

開発時のみLaravelでReactのOriginを許可する。

# 7. 移行中と移行後の本番構成

- 移行前: Render React SPA + Laravel Cloud REST API。backend/frontendは別branch・別PR。
- I1〜I5: Laravel CloudのInertia routeと旧Render SPA/APIを並行保持し、page単位で切り戻す。
- I6後: Laravel CloudでPHPとReact/Vite assetを単一配信。Renderはrollback先として保持する。
- I7: access・code referenceが0件の旧endpointと旧Render設定だけを停止後に別releaseで削除する。

APIは全面廃止しない。offline再送、通知、Service Worker、native/外部clientに必要なendpointは残す。
