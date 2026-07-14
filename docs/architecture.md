# くらしリレー
## アーキテクチャ方針 v0.1

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

第2実装以降にLaravel SanctumのCookieベースSPA認証を追加する。

# 6. 開発環境

```text
React:       http://localhost:5173
Laravel API: http://localhost:8000
```

開発時のみLaravelでReactのOriginを許可する。

# 7. 将来の本番構成候補

初期PoCは同一トップレベルドメイン、可能なら単一デプロイを優先する。

```text
/       React SPA
/api/*  Laravel API
```

本番デプロイ先は、第1実装と画面レビュー後に決定する。

検証用の一時プレビューとして、Renderへの分離デプロイ手順は
[docs/render-preview-deployment.md](./render-preview-deployment.md) を参照する。
（Fixtureのみ。認証・DB・本番公開ではない）
